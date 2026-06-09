import React, {useState, useEffect, useRef} from "react";
import {getURL, postWithoutImage, getAPITypes, getPostID, setNestedKey} from "../../context/utilities";
import notify from "../../context/Notify";
import ImageSourcePicker from "./ImageSourcePicker";

export default function IntegrationSection({
                                               productModel,
                                               addField,
                                               removeField,
                                               handleIntegrationChange,
                                               settings,
                                               currentApi,
                                               handleChange,
                                               setProductModel
                                           }) {

    const [previousBody, setPreviousBody] = useState(null)
    const [previousModelType, setPreviousModelType] = useState(null)
    const [tempModelData, setTempModelData] = useState(null)

    /**
     * AR-62 §3 — generation polling state.
     *
     * The poll loop is a recursive setTimeout (so we can vary the delay
     * each tick) instead of setInterval. Refs hold the controls so a
     * Cancel-button click can stop the loop from outside the closure
     * and an unmount cleans up any in-flight schedule.
     */
    const pollTimeoutRef = useRef(null);
    const pollAttemptsRef = useRef(0);
    const pollAbortedRef = useRef(false);
    const [pollingActive, setPollingActive] = useState(false);

    /**
     * AR-62 §4 — count of consecutive polls where Tripo3D reported
     * `progress >= 99`. Once we cross that threshold, the mesh is
     * done but the GLB/texture encoder is still running on Tripo's
     * side. The label flips to "Finalizing model" and we override
     * the backoff to a tight 5 s. After 3 ticks we also surface a
     * caption under the button so the user knows the slowdown is
     * expected.
     */
    const [finalizeCount, setFinalizeCount] = useState(0);

    /**
     * AR-62 §4 — one-shot guard for the mount-time "you have an
     * unfinished task_id in this post's body — resume?" detection.
     * Without the gate, every change to the body rows would re-run
     * the resume conversion and clobber the user mid-edit.
     */
    const hasCheckedResumeRef = useRef(false);

    /** Exponential backoff schedule: 5s, 10s, 15s, 30s (then 30s cap). */
    const POLL_DELAYS_MS = [5000, 10000, 15000, 30000];
    /** Hard cap on polls — ≈ 5 min including backoff growth. */
    const POLL_MAX_ATTEMPTS = 20;
    /** Tight poll cadence once Tripo3D reports >=99% (encoder tail). */
    const FINALIZE_POLL_MS = 5000;

    // Spinner-state set: in-progress states get an animated spinner
    // glyph alongside the label; idle / success / error states do not.
    const SPINNER_STATES = new Set(['progress', 'task', 'poster', 'save_progress', 'data_save']);

    /** Tiny HTML escape for the label substituted into innerHTML. */
    const escapeLabel = (s) => String(s).replace(/[&<>"]/g, c => (
        {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]
    ));

    useEffect(() => {
        return () => {
            if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
            pollAbortedRef.current = true;
        };
    }, []);

    /**
     * AR-62 §4 — on the first render after the body rows arrive from
     * REST, look for a stored `task_id` that has NOT yet resulted in
     * a saved model (`productModel.src` is still empty). That's the
     * exact shape of "user kicked off a generation, got bored or
     * closed the tab, came back later". Convert the Generate Model
     * button into a one-click "Resume waiting for Tripo3D task"
     * affordance instead of forcing them to paste the task_id back
     * in by hand. Gated by hasCheckedResumeRef so future body edits
     * don't keep flipping the button.
     */
    useEffect(() => {
        if (hasCheckedResumeRef.current) return;
        const body = productModel?.exclude_integration_api_body;
        if (!Array.isArray(body) || body.length === 0) return;

        hasCheckedResumeRef.current = true;
        const taskIdRow = body.find(r => r && r.key === 'task_id');
        if (taskIdRow?.value && !productModel?.src) {
            const btn = document.getElementById('atlas_ar_model_generate');
            if (btn && btn.getAttribute('data-id') === 'generate') {
                generateModelButtonStateChange('resume', 'Resume waiting for Tripo3D task', btn);
            }
        }
    }, [productModel?.exclude_integration_api_body, productModel?.src]);

    const stopPolling = () => {
        if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
        }
        pollAbortedRef.current = true;
        pollAttemptsRef.current = 0;
        setPollingActive(false);
        setFinalizeCount(0);
    };

    /**
     * AR-62 §4 — Cancel is the user explicitly abandoning the task.
     * Clear the task_id row alongside the polling state so the next
     * Generate Model click starts a fresh task instead of resuming
     * the abandoned one. Timeout is handled separately and keeps
     * the row in place.
     */
    const cancelGeneration = () => {
        stopPolling();
        const updated = structuredClone(productModel);
        if (Array.isArray(updated.exclude_integration_api_body)) {
            updated.exclude_integration_api_body = updated.exclude_integration_api_body.filter(
                r => r && r.key !== 'task_id'
            );
        }
        setProductModel(updated);
        const btn = document.getElementById('atlas_ar_model_generate');
        if (btn) {
            generateModelButtonStateChange('generate', 'Generate Model', btn);
        }
        notify('Generation cancelled. Task ID cleared.', 'warn', {autoClose: 3000});
    };

    /**
     * Recursive poller for Tripo3D / Meshy AI task status.
     *
     * Behaviours covered:
     *  - exponential backoff (5s → 10s → 15s → 30s cap)
     *  - hard cap at POLL_MAX_ATTEMPTS polls
     *  - exits cleanly on Tripo3D status `failed` / `banned` /
     *    `expired` / `cancelled` (surfaces error_msg / error_code)
     *  - surfaces live progress percent / ETA / queue position in the
     *    button label
     *  - sends only the task_id to PHP, not the original body
     *  - cancellable from outside via pollAbortedRef
     */
    const startPolling = (taskId, baseDataArr, submitButton) => {
        pollAbortedRef.current = false;
        pollAttemptsRef.current = 0;
        setPollingActive(true);
        setFinalizeCount(0);

        const poll = async () => {
            if (pollAbortedRef.current) return;

            if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
                /**
                 * AR-62 §4 — local hard cap reached. The Tripo3D
                 * task is almost certainly still running on their
                 * side; we just stopped asking. Flip the button to
                 * a `resume` state instead of `generate` so the
                 * next click picks up polling without a new create
                 * (no extra credits) and without making the user
                 * paste the task_id back in.
                 */
                stopPolling();
                submitButton.setAttribute('data-id', 'resume');
                generateModelButtonStateChange('resume', 'Click to resume waiting', submitButton);
                notify(
                    'Generation is taking longer than expected. Your Tripo3D task is still running — click "Click to resume waiting" to keep polling (no extra credits will be charged).',
                    'warn',
                    {autoClose: 12000}
                );
                return;
            }
            pollAttemptsRef.current++;

            // AR-62 §3e: minimal polling payload.
            const pollData = {
                url:      baseDataArr.url,
                api_name: baseDataArr.api_name,
                headers:  baseDataArr.headers,
                post_id:  baseDataArr.post_id,
                body:     { task_id: taskId, type: baseDataArr.body?.type || '' },
            };

            let responseData;
            try {
                const formData = new FormData();
                formData.append('data', JSON.stringify(pollData));
                const response = await fetch(getURL('generate_3d_model'), {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-WP-Nonce': ar_try_on.rest_nonce },
                });
                responseData = await response.json();
            } catch (err) {
                if (pollAbortedRef.current) return;
                console.warn('[AR-62 poll] network error, will retry:', err?.message || err);
                const delay = POLL_DELAYS_MS[Math.min(pollAttemptsRef.current - 1, POLL_DELAYS_MS.length - 1)];
                pollTimeoutRef.current = setTimeout(poll, delay);
                return;
            }
            if (pollAbortedRef.current) return;

            // Success — files downloaded to temp.
            if (responseData?.data?.temp?.src?.url) {
                stopPolling();
                let tempProductModel = structuredClone(productModel);
                tempProductModel.src = responseData.data.temp.src.url;
                if (responseData?.data?.temp?.poster?.url) {
                    tempProductModel.poster = responseData.data.temp.poster.url;
                }
                if (responseData?.data?.task_id) {
                    tempProductModel.exclude_integration_api_body = insertUnique(
                        tempProductModel.exclude_integration_api_body,
                        {key: 'task_id', type: 'textarea', value: responseData.data.task_id}
                    );
                }
                setTempModelData({...{temp: responseData.data.temp}, ...{post_id: baseDataArr.post_id}});
                setProductModel(tempProductModel);
                generateModelButtonStateChange('save', 'Save This Model', submitButton);
                if (typeof wp !== 'undefined' && wp?.hooks?.doAction) {
                    wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                }
                return;
            }

            // AR-62 §3a: terminal failure from Tripo3D.
            const tripoStatus = (responseData?.data?.status || '').toLowerCase();
            const failureStates = ['failed', 'banned', 'expired', 'cancelled', 'unknown'];
            if (failureStates.includes(tripoStatus)) {
                stopPolling();
                const errorCode = responseData?.data?.error_code;
                const errMsg    = responseData?.data?.error_msg;
                const msg = errMsg || (errorCode
                    ? `Generation failed (Tripo3D error ${errorCode}). Try a different input.`
                    : 'Generation failed on Tripo3D. Try a different input.');
                submitButton.setAttribute('data-id', 'generate');
                generateModelButtonStateChange('error', 'Generation failed — click to try again', submitButton);
                notify(msg, 'error', {autoClose: 8000});
                return;
            }

            // AR-62 §3d + §4: live progress / ETA / queue surface,
            // with smarter end-game handling.
            const progress = responseData?.data?.progress;
            const eta      = responseData?.data?.running_left_time;
            const queueing = responseData?.data?.queuing_num;

            // Tripo3D jumps to 99% as soon as the mesh is done but
            // the GLB/texture encoder runs for another 20-60s. Show
            // "Finalizing model" so the user sees a phase change
            // instead of staring at a static 99%, AND tighten the
            // poll cadence so we catch completion sooner.
            const isFinalizing = typeof progress === 'number' && progress >= 99;
            let label;
            if (isFinalizing) {
                label = 'Finalizing model';
                setFinalizeCount(c => c + 1);
            } else {
                if (finalizeCount !== 0) setFinalizeCount(0);
                if (tripoStatus === 'queued' && typeof queueing === 'number' && queueing > 0) {
                    label = `Queued at Tripo3D — position ${queueing}`;
                } else if (typeof progress === 'number' && progress > 0 && progress < 100) {
                    label = `Generating model — ${progress}%`;
                } else if (typeof eta === 'number' && eta > 0) {
                    label = `Generating model — ~${eta}s left`;
                } else {
                    label = 'Generating model';
                }
            }
            generateModelButtonStateChange('poster', label, submitButton);

            // Schedule next poll. Finalizing phase uses a tight 5s
            // cadence; otherwise fall back to the exponential
            // backoff schedule.
            const delay = isFinalizing
                ? FINALIZE_POLL_MS
                : POLL_DELAYS_MS[Math.min(pollAttemptsRef.current - 1, POLL_DELAYS_MS.length - 1)];
            pollTimeoutRef.current = setTimeout(poll, delay);
        };

        // First poll fires after the short initial delay (Tripo3D is
        // usually still "queued" for the first ~5s).
        pollTimeoutRef.current = setTimeout(poll, POLL_DELAYS_MS[0]);
    };

    function insertUnique(array, newItem, shouldReplace = false) {
        const index = array.findIndex(item => item.key === newItem.key);

        if (index === -1) {
            // if key not found → insert new
            array.push(newItem);
        }

        if (shouldReplace) {
            // if key exists and shouldReplace is true → replace
            array[index] = newItem;
        }

        return array;
    }
    const generateModelButtonStateChange = (state, innerText, submitButton = '') => {
        if (!submitButton) {
            submitButton = document.getElementById('atlas_ar_model_generate');
        }
        if (state) {
            submitButton.setAttribute('data-id', state)
        }

        if (innerText) {
            // AR-62 §2: strip the legacy trailing-dots progress hint
            // and inject a real spinner for in-progress states.
            const cleaned = String(innerText).replace(/\.{2,}/g, '').replace(/\s+$/, '').trim();
            const safe = escapeLabel(cleaned);
            submitButton.innerHTML = SPINNER_STATES.has(state)
                ? '<span class="atlas-ar-spinner" aria-hidden="true"></span><span>' + safe + '</span>'
                : safe;
        }
    }
    const handleSubmit = async (e) => {
        let submitButton = e.target;
        e.preventDefault();
        const postId = getPostID()
        if (!postId) {
            notify('Please publish the post first. Then reload the page and save.', 'warn', {
                autoClose: 5000,
            })
            return;
        }

        if (submitButton.getAttribute('data-id') === 'complete') {
            /**
             * After a successful save the button label flips to
             * "See model from frontend." but it's the same DOM
             * element — clicking it used to fall through to the
             * regenerate confirmation, which is the opposite of
             * what the label promises. When the button is in
             * "see model from frontend" mode, treat it as a link
             * to the post permalink instead.
             */
            const btnText = (submitButton.innerText || submitButton.textContent || '').toLowerCase();
            const looksLikeFrontendCta = btnText.includes('frontend') || btnText.includes('see model');
            if (looksLikeFrontendCta) {
                const permalink =
                    document.querySelector('#sample-permalink a')?.href
                    || document.querySelector('#wp-admin-bar-view a')?.href
                    || (window.ar_try_on?.permalink || '');
                if (permalink) {
                    window.open(permalink, '_blank', 'noopener,noreferrer');
                    return;
                }
                notify('Could not detect the post permalink — use the "View product" link in the admin bar.', 'warn', { autoClose: 4000 });
                return;
            }
            if (!confirm('Model is generated successfully. Are you sure you want to generate the model again?')) {
                return;
            }
            generateModelButtonStateChange('generate', 'Generating Model', submitButton)
        }

        /**
         * Build data to generate model or save model.
         * @type {{}}
         */
        let headers = {}
        if(!settings?.ar_try_on_exclude_integration_api_headers) {
            notify('Please integrate first from Integration Tab of the plugin', 'error');
            return;
        }
        settings.ar_try_on_exclude_integration_api_headers.map(header => {
            headers[header.key] = header.value;
        });

        /**
         * Build the request body. The editor schema is FLAT
         * (e.g. `{key: "file.url", value: "..."}`) so dot-paths
         * have to be re-nested into the shape Tripo3D / Meshy AI
         * actually expect on the wire (`{file: {url: "..."}}`).
         * Without this, image_to_model never receives the image
         * and the task polls forever (Joachim Rodriguez, 2026-06-07).
         */
        let body = {}
        productModel.exclude_integration_api_body.forEach(item => {
            setNestedKey(body, item.key, item.value);
        });

        /**
         * For image_to_model, Tripo3D requires exactly one of
         * file.file_token / file.url / file.object — they are
         * mutually exclusive. Empty strings still occupy a slot
         * and cause the request to be rejected, so drop them.
         */
        if (body?.file && typeof body.file === 'object' && body.file !== null) {
            ['file_token', 'url', 'object'].forEach(k => {
                if (body.file[k] === '' || body.file[k] == null) {
                    delete body.file[k];
                }
            });
        }

        let data_arr = {};
        data_arr['url'] = settings?.ar_try_on_exclude_integration_api_url || ''
        data_arr['api_name'] = settings?.ar_try_on_exclude_integration_api_name || ''
        data_arr['headers'] = headers;
        data_arr['body'] = body
        data_arr['post_id'] = postId
        if (data_arr?.url == '' || data_arr?.api_name == '') {
            notify('Please integrate first from Integration Tab of the plugin', 'error');
            return;
        }

        const taskType = data_arr?.body?.type;
        /**
         * AR-62 §4 — when the user is resuming an existing Tripo3D
         * task (button data-id === 'resume'), we already have a
         * task_id and skip the create call entirely. The prompt /
         * image-input checks below would only ever block the user
         * from picking up where they left off; bypass them.
         */
        const isResume = submitButton.getAttribute('data-id') === 'resume';

        // text_to_model needs a real prompt.
        if (!isResume
            && (data_arr?.api_name == 'meshy_ai' || data_arr?.api_name == 'tripo3d')
            && taskType === 'text_to_model'
            && (data_arr?.body?.prompt == '' || data_arr?.body?.prompt?.length < 3)) {
            notify('Please write a proper prompt', 'error');
            return;
        }

        // image_to_model needs at least one image input.
        if (!isResume && data_arr?.api_name == 'tripo3d' && taskType === 'image_to_model') {
            const hasImage = !!(
                data_arr?.body?.file?.url ||
                data_arr?.body?.file?.file_token ||
                data_arr?.body?.file?.object
            );
            if (!hasImage) {
                notify('Please provide an image URL or upload an image before generating.', 'error');
                return;
            }
        }

        /**
         * Generate model and save it to temporary folder. also get the temporary model url
         * and temporary poster url and preview it. at that time button state will be "save"
         * If user is satisfied then click button again. To save it on permanent folder
         */
        /**
         * AR-62 §4 — Resume: we already have a task_id and just need
         * to keep polling. Skip the create POST entirely, go straight
         * to the poller. No extra Tripo3D create charge, no fresh
         * task — purely a status read.
         */
        if (submitButton.getAttribute('data-id') === 'resume') {
            if (!data_arr?.body?.task_id) {
                notify('No task ID found to resume. Generate a fresh task instead.', 'error');
                return;
            }
            generateModelButtonStateChange('task', 'Resuming — waiting for Tripo3D', submitButton);
            startPolling(data_arr.body.task_id, data_arr, submitButton);
            return;
        }

        if (submitButton.getAttribute('data-id') === 'generate') {

            if (data_arr?.body?.task_id) {
                generateModelButtonStateChange('progress', 'Generating Model', submitButton)
            } else {
                generateModelButtonStateChange('progress', 'Generating Task', submitButton)
            }
            console.log(data_arr)
            // return;
            let formData = new FormData();
            formData.append('data', JSON.stringify(data_arr));
            postWithoutImage(getURL('generate_3d_model'), formData).then(
                (res) => {
                    console.log(res)
                    /**
                     * This code  will be true why request is being sent with task_id
                     */
                    if (res?.status && res?.data?.temp?.src?.url) {
                        let tempProductModel = structuredClone(productModel)
                        // set product model file
                        tempProductModel.src = res.data.temp.src.url
                        // set product poster image
                        if (res?.data?.temp?.poster?.url) {
                            tempProductModel.poster = res.data.temp.poster.url
                        }

                        // set product body with task_id
                        if (res?.data?.input?.prompt) {
                            tempProductModel.exclude_integration_api_body  = insertUnique(tempProductModel.exclude_integration_api_body,{key: 'prompt', type: 'textarea', value: res.data.input.prompt}, true)
                            tempProductModel.exclude_integration_api_body  = insertUnique(tempProductModel.exclude_integration_api_body,{key: 'task_id', type: 'textarea', value: res.data.task_id})
                        }

                        setProductModel(tempProductModel)
                        setTempModelData({...{temp: res.data.temp}, ...{post_id: data_arr.post_id}})
                        console.log({tempProductModel})
                        generateModelButtonStateChange('save', 'Save This Model', submitButton)
                        wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                        return;
                    }

                    if (res?.data?.task_id) {
                        /**
                         * AR-62 §4 — auto-write the task_id into the
                         * body as a visible row the second it lands.
                         * If the polling loop times out, browser
                         * crashes, or the user closes the tab and
                         * comes back, the task_id is right there in
                         * the form (and persists to DB on save) —
                         * Generate Model can resume on the same task
                         * with no manual paste and no extra Tripo3D
                         * create charge.
                         */
                        const updated = structuredClone(productModel);
                        updated.exclude_integration_api_body = insertUnique(
                            updated.exclude_integration_api_body || [],
                            {key: 'task_id', type: 'text', value: res.data.task_id},
                            true
                        );
                        setProductModel(updated);

                        generateModelButtonStateChange('task', 'Task created — waiting for Tripo3D', submitButton)
                    }
                    /**
                     * AR-62 §3: hand off to the controlled poller.
                     * It owns exponential backoff, the hard cap, the
                     * Tripo3D status-failed bail-out, the live progress
                     * label, and the trimmed payload.
                     */
                    if (!res?.data?.temp?.src?.url && res?.data?.task_id) {
                        startPolling(res.data.task_id, data_arr, submitButton);
                    }
                });
            /**
             * When button state is "save" then it will move the temporay
             * files to permanent folder.
             */
        } else if (submitButton.getAttribute('data-id') === 'save') {
            console.log(tempModelData)
            if (!tempModelData?.temp) {
                generateModelButtonStateChange('error', 'Model data is not set!', submitButton)
                console.error('Model data is not set!')
                return;
            }
            /**
             * Save model files from temporary folder to final folder.
             */
            generateModelButtonStateChange('save_progress', 'Saving model files', submitButton)
            let formData2 = new FormData();
            data_arr['temporary_model_data'] = tempModelData
            formData2.append('data', JSON.stringify(data_arr));
            let response = await fetch(getURL('generate_3d_model'), {
                method: "POST", // *GET, POST, PUT, DELETE, etc.
                body: formData2, // body data type must match "Content-Type" header
                headers: {
                    'X-WP-Nonce': ar_try_on.rest_nonce
                },
            });
            response = await response.json();
            let tempProductModel = structuredClone(productModel)
            if (!response?.data?.src?.url) {
                generateModelButtonStateChange('error', 'Something went wrong! Try again.', submitButton)
                return;
            }
            // set model src
            tempProductModel.src = response.data.src.url
            // set model poster.
            if (response?.data?.poster?.url) {
                tempProductModel.poster = response.data.poster.url
            }
            /**
             * Default the model-viewer alt to the post title when the
             * user hasn't customised it. "Title" is the productModel
             * default in ARProductModelSettings.js — treat that as
             * "still placeholder". For an image_to_model save, the
             * product name is the most accurate accessibility label
             * (screen readers read it as "3D model of <product>").
             */
            const currentAlt = (tempProductModel.alt || '').trim();
            if (currentAlt === '' || currentAlt.toLowerCase() === 'title') {
                const postTitle = (
                    document.querySelector('#title')?.value
                    || document.querySelector('.editor-post-title__input')?.value
                    || ''
                ).trim();
                if (postTitle) {
                    tempProductModel.alt = postTitle;
                }
            }

            setTempModelData({})
            setProductModel(tempProductModel)
            generateModelButtonStateChange('file_saved', 'Model files saved successfully.', submitButton)

            /**
             * Save product model data with updated poster ans src url to database.
             */
            console.log(tempProductModel)
            let formData = new FormData();
            formData.append('fields', JSON.stringify(tempProductModel));
            formData.append('post_id', postId);
            formData.append('method', 'POST');

            setTimeout(() => {
                generateModelButtonStateChange('data_save', 'Saving model data', submitButton)
            }, 10)
            postWithoutImage(getURL('get_model_and_settings'), formData)
                .then((res) => {
                    console.log(res)
                    let tempProductModel = {...productModel, ...res.data};
                    setProductModel(tempProductModel);
                    notify('Successfully Saved All Data.', 'success', {
                        autoClose: 5000,
                    })
                    generateModelButtonStateChange('complete', 'Successfully Saved All Data.', submitButton)
                    setTimeout(() => {
                        generateModelButtonStateChange('complete', 'See model from frontend.', submitButton)
                    }, 2000)
                    wp.hooks.doAction('atlas_ar_preview_data', tempProductModel);
                })
                .catch((err) => {
                    console.log(err);
                });

        } else {
            generateModelButtonStateChange('double_click', 'Do not click multiple time!', submitButton)
        }
    };

    useEffect(() => {
        console.log({currentApi})
    }, [currentApi]);

    useEffect(() => {
        if (!previousBody && productModel?.exclude_integration_api_body) {
            setPreviousBody(productModel.exclude_integration_api_body)
        }
        if (!previousModelType && productModel?.exclude_integration_api_model_type) {
            setPreviousModelType(productModel.exclude_integration_api_model_type)
        }

        if (productModel?.exclude_integration_api_model_type
            && previousModelType
            && productModel?.exclude_integration_api_model_type !== previousModelType) {

            let productModelData = structuredClone(productModel);
            productModelData.exclude_integration_api_body = currentApi.body.supported_types[productModel?.exclude_integration_api_model_type].input
            console.log({productModelData, previousBody})
            //TODO:: un endign loop
            // setProductModel(productModelData);
        }

    }, [productModel])


    // Pro-gated image picker takes over the body editor for
    // Tripo3D/Meshy AI image_to_model — hide the raw key/value rows
    // and the Add Body button while it's active.
    const _proActive = (window.ar_try_on?.is_pro_active === '1'
        || window.ar_try_on?.is_pro_active === 1
        || window.ar_try_on?.is_pro_active === true);
    const pickerActive = _proActive
        && productModel?.exclude_integration_api_model_type === 'image_to_model';

    /**
     * Generation modes the host site is licensed to actually run.
     * Filled by Free's `atlas_ar_generation_supported_modes` filter:
     *   - Free alone returns `['text_to_model']`.
     *   - Pro extends with `image_to_model` via
     *     `AR_TRY_ON_Pro_Bridge::add_pro_generation_modes()`.
     *
     * The dropdown intersects what the API exposes (text_to_model,
     * image_to_model, ...) with what the SITE supports — so a
     * Free-only install hides image_to_model entirely instead of
     * letting the user pick a feature that can't run.
     */
    const _allowedModes = Array.isArray(window.ar_try_on?.generation_supported_modes)
        ? window.ar_try_on.generation_supported_modes
        : ['text_to_model'];
    const _apiSupportedTypes = currentApi?.body?.supported_types || {};
    const _visibleModes = Object.keys(_apiSupportedTypes).filter(t => _allowedModes.includes(t));
    const _imageModeUnlocked = _allowedModes.includes('image_to_model');

    return (
        <div className="art-bg-gray-100 ">
            <h3 className="art-font-medium art-mb-4">Integration</h3>
            {currentApi?.id && <div style={{marginBottom: "15px"}}>
                <label>Supported Model Types:</label>
                <select
                    value={productModel.exclude_integration_api_model_type}
                    name="exclude_integration_api_model_type"
                    id="exclude_integration_api_model_type"
                    onChange={(e) => handleChange(e)}
                    style={{width: "100%", padding: "8px", marginTop: "5px"}}
                >
                    {
                        _visibleModes.map(model_type => (
                            <option key={model_type} value={model_type}>
                                {model_type}
                            </option>
                        ))
                    }
                </select>
                {/*
                  * Upsell notice for Free users: when image_to_model is
                  * NOT in the host site's allowed list AND the Tripo3D
                  * schema actually exposes it, surface a small inline
                  * pitch with a link to atlasaidev.com. This is the
                  * Yoast-pattern shape — informational link, no locked
                  * control, no "fake" image_to_model option that the
                  * user can click to discover it's gated.
                  */}
                {!_imageModeUnlocked && _apiSupportedTypes.image_to_model && (
                    <div
                        style={{
                            background: '#eff6ff',
                            border: '1px solid #93c5fd',
                            borderRadius: 6,
                            padding: '10px 12px',
                            marginTop: 8,
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: '#1e3a8a',
                        }}
                    >
                        <strong>Want image-to-3D generation?</strong>
                        {' '}Upload a product photo (featured image, gallery, media library,
                        {' '}or your own URL) and turn it directly into a 3D model — no prompt
                        {' '}writing needed. <em>Image-to-3D is part of AtlasAR Pro.</em>
                        {' '}
                        <a
                            href="https://wpaugmentedreality.com/pricing/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{color: '#1d4ed8', fontWeight: 600, textDecoration: 'underline'}}
                        >
                            See Pro pricing →
                        </a>
                    </div>
                )}
            </div>

            }

            {/*
              * Pro-gated image-source picker for Tripo3D / Meshy AI
              * image_to_model. Renders ONLY when:
              *   - Pro is active (is_pro_active === '1'), AND
              *   - the selected supported model type is image_to_model
              * Replaces the dynamic key/value rows below with a guided
              * 4-source picker (featured / gallery / library / upload).
              * The picker writes back into exclude_integration_api_body
              * so the existing Generate Model submit path works
              * unchanged.
              */}
            {pickerActive && (
                <ImageSourcePicker
                    productModel={productModel}
                    setProductModel={setProductModel}
                />
            )}

            {!pickerActive && (<>
            {/* Add new field button */}
            <div className="art-flex art-items-center art-justify-between">
                {/* Add Body Button */}
                <button
                    type="button"
                    onClick={addField}
                    className="art-mb-4 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border-none art-hover:bg-blue-600"
                >
                    Add Body
                </button>

                {/* Tooltip Button */}
                <div className="art-relative art-group">
                    <button
                        type="button"
                        className="art-bg-gray-200  art-p-2  art-cursor-pointer"
                    >
                        <span className="dashicons dashicons-info-outline"></span>
                    </button>

                    {/* Tooltip Text */}
                    <div
                        className="art-absolute art-bottom-full art-right-full art-w-40 art-mr-2 art-mb-2 art-bg-black art-text-white art-text-sm art-rounded art-p-2 art-shadow-lg art-opacity-0 art-invisible art-transition-all art-duration-300 group-hover:art-opacity-100 group-hover:art-visible">
                        Model Documentation:
                        <br/>
                        {currentApi?.body?.supported_types?.[productModel.exclude_integration_api_model_type]?.doc ? (
                            <p>
                                {currentApi.name}:
                                <a
                                    href={currentApi.body.supported_types[productModel.exclude_integration_api_model_type].doc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="art-text-blue-400 hover:art-text-blue-300 art-underline art-ml-1"
                                >
                                    {productModel.exclude_integration_api_model_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Guide
                                </a>
                            </p>
                        ) : (
                            <p>No documentation available for this model type.</p>
                        )}
                    </div>
                </div>
            </div>


            {/* Dynamic rows */}
            {productModel.exclude_integration_api_body.map((field, index) => (
                <div key={index} className="art-flex art-gap-4 art-mb-4 art-flex-nowrap">
                    <input
                        type="text"
                        placeholder="Key"
                        value={field.key}
                        onChange={(e) => handleIntegrationChange(index, "key", e.target.value)}
                        className="art-border art-rounded art-p-2 art-w-1/5"
                    />

                    <select
                        value={field.type}
                        onChange={(e) => handleIntegrationChange(index, "type", e.target.value)}
                        className="art-border art-rounded art-p-2 art-w-1/5"
                    >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="textarea">Textarea</option>
                        <option value="file">File</option>
                    </select>

                    {field.type === "textarea" ? (
                        <textarea
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleIntegrationChange(index, "value", e.target.value)}
                            className="art-border art-rounded art-p-2 art-w-1/2"
                            style={{height: '100px'}}
                        />
                    ) : (
                        <input
                            type={field.type}
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleIntegrationChange(index, "value", e.target.value)}
                            className="art-border art-rounded art-p-2 art-w-1/2"
                        />
                    )}

                    {/* <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="art-bg-blue-500 art-text-white art-px-2 art-rounded art-border-none"
                    >
                        ✕

                    </button> */}


                    {!field.required ? (
                        <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="art-bg-blue-500 art-text-white art-px-2 art-rounded art-border-none"
                            title="Remove field"
                        >
                            ✕
                        </button>
                    ) : (
                        <div className="art-px-2 art-py-1 art-text-gray-400 art-flex art-items-center"
                             title="Required field">
                        </div>
                    )}

                </div>

            ))}
            </>)}
            <button type="button"
                    onClick={handleSubmit}
                    data-id={'generate'}
                    id={"atlas_ar_model_generate"}
                    className="art-w-full art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 ">
                Generate Model
            </button>
            {/*
              * AR-62 §3c: Cancel button — visible only while a poll
              * loop is in flight. Clears the next-poll timeout, sets
              * the abort flag (so any in-flight fetch resolves into a
              * no-op), resets the button label, and notifies the
              * user. Without this the user had no way to stop a
              * mistaken or runaway generation short of a hard reload.
              */}
            {pollingActive && (
                <button
                    type="button"
                    onClick={cancelGeneration}
                    className="art-w-full art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-white art-text-gray-700 art-rounded art-border art-border-gray-300"
                    style={{fontSize: 13}}
                >
                    Cancel generation
                </button>
            )}
            {/*
              * AR-62 §4 — once we've sat at "Finalizing model" for 3+
              * polls, Tripo3D's mesh encoder is doing slow tail work.
              * Surface a small caption so the user doesn't think the
              * process is stuck (no behavioural change — the poller
              * keeps the tight 5 s cadence in this phase already).
              */}
            {pollingActive && finalizeCount >= 3 && (
                <div
                    className="art-text-xs art-text-gray-500 art-mt-2"
                    style={{textAlign: 'center', lineHeight: 1.4}}
                >
                    Tripo3D's mesh encoder finishes after the progress bar — usually 20–40 s more.
                </div>
            )}
        </div>
    );
}
