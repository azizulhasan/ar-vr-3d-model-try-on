import alertify from 'alertifyjs';

import {getURL, postWithoutImage} from "../../src/context/utilities";

document.addEventListener('DOMContentLoaded', async  () => {
    'use strict';
    // Add event listener to the button
    const url = new URL(window.location.href);
    const product_id = url.searchParams.get("post");


    // Verify if product_id is defined
    if (!product_id) {
        console.error('Product ID is missing');
        return;
    }
    // Your custom HTML content
    if (false) {
        const htmlContent = `
                  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <button class="close-btn" id="closeModal">&times;</button>
      <h2>Modal Content</h2>
      <p>This is a custom modal with blurred background and white content area.</p>
    </div>
  </div>`;

        let loadingMessage;
        // Show loading message before sending the request
        loadingMessage = alertify.success('Loading 3D model...', 2000);
        let formData = new FormData();
        formData.append('product_id', product_id);
        await postWithoutImage(getURL('get_model_and_settings'), formData)
            .then((response) => {
                console.log(response);

                // Hide loading message
                if (loadingMessage) {
                    loadingMessage.dismiss();
                }

                if (response.success) {
                    const data = response.data;

                    // Use the product name as the modal title
                    const productName = data.product_name || '3D Product';

                    // alertify
                    //     .alert(productName, htmlContent)
                    //     .set({
                    //         transition: 'zoom',
                    //         movable: true,
                    //         maximizable: true,
                    //         // resizable: true,
                    //     }) // Customize options
                    //     .setHeader(productName);

                    // Function to append modal to DOM
                    function showModal() {
                        // Create overlay
                        const overlay = document.createElement('div');
                        overlay.className = 'modal-overlay';

                        // Create modal content
                        const modalContent = document.createElement('div');
                        modalContent.className = 'modal-content';
                        modalContent.id = 'ar_try_on_model_viewer';

                        // Add close button
                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'close-btn';
                        closeBtn.textContent = 'Close';
                        closeBtn.onclick = function () {
                            document.body.removeChild(overlay);
                        };

                        // Add content to modal
                        modalContent.innerHTML = '<h2>Modal Title</h2><p>This is a custom modal.</p>';
                        modalContent.appendChild(closeBtn);

                        // Append modal content to overlay
                        overlay.appendChild(modalContent);

                        // Append overlay to body
                        document.body.appendChild(overlay);
                    }

                    // Check if the data exists before assigning it to model-viewer
                    if (data) {
                        showModal()
                        wp.hooks.doAction('ar_try_on_pro_load_face_model', htmlContent, data);
                    }

                } else {
                    console.error(response.data);
                }
            })
            .catch((err) => {
                console.log(err);
            });
    } else {
        const htmlContent = `
                        <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <model-viewer 
                                id="model-viewer" 
                                src="" 
                                alt="" 
                                poster="" 
                                reveal="" 
                                loading="" 
                                ar 
                                ar-modes="" 
                                camera-controls
                                ar-scale="auto"
                                xr-environment
                                style="width: 100%; max-width: 600px; height: 400px;"
                            ></model-viewer>
                        </div>`;

        document.getElementById('ar_try_on_preveiw').innerHTML = htmlContent


        let formData = new FormData();
        formData.append('product_id', product_id);
        let model_settings = {}
        await postWithoutImage(getURL('get_model_and_settings'), formData)
            .then((response) => {
                console.log(response);
                if (response.success) {
                     model_settings = response.data;
                    console.log(model_settings)
                } else {
                    console.error(response.data);
                }
            })
            .catch((err) => {
                console.log(err);
            });
        wp.hooks.addAction('ar_try_on_preview_data', 'ar_try_on', function (data) {

            model_settings.model_3d_file = data.ar_try_on_file_android;
            model_settings.model_ios_file = data.ar_try_on_file_ios;
            model_settings.model_alt = data.ar_try_on_file_alt;
            model_settings.model_poster = data.ar_try_on_file_poster;
            model_settings.ar_placement = data.ar_try_on_ar_placement;

            console.log({model_settings})
            console.log({data})
                // Check if the data exists before assigning it to model-viewer
                if (model_settings) {
                    const modelViewer = document.getElementById('model-viewer');
                    if (modelViewer) {
                        modelViewer.setAttribute('src', model_settings.model_3d_file || '');
                        modelViewer.setAttribute('ios-src', model_settings.model_ios_file || '');
                        modelViewer.setAttribute('alt', model_settings.model_alt || '');
                        modelViewer.setAttribute('poster', model_settings.model_poster || '');
                        modelViewer.setAttribute('reveal', model_settings.reveal || 'auto');
                        modelViewer.setAttribute('loading', model_settings.loading || 'auto');
                        modelViewer.setAttribute('ar-modes', (model_settings.ar_modes || []).join(' '));
                        modelViewer.setAttribute('ar-placement', (model_settings.ar_placement || 'floor'));
                        modelViewer.style.backgroundColor = model_settings.poster_color || 'rgba(255,255,255,0)';
                        const scale = model_settings.scale || 'auto'; // Default value if not defined
                        modelViewer.setAttribute('ar-scale', scale); // Use "auto" or "fixed" as needed
                        if (model_settings.ar === "deactivate") {
                            modelViewer.removeAttribute('ar');
                        }
                        if (model_settings.xr_environment === "deactivate") {
                            modelViewer.removeAttribute('xr-environment');
                        }
                        // TODO: add functionality for this.
                        // if(data.custom_button === "activate") {
                        //     modelViewer.innerHTML =  `<button> ${data.custom_button_text || 'Activate Ar'} </button>` ;
                        // }

                    }
                }

                // if (response.success) {
                //     const data = response.data;
                //
                //     // Use the product name as the modal title
                //     const productName = data.product_name || '3D Product';
                //
                //
                //     // alertify
                //     //     .alert(productName, htmlContent)
                //     //     .set({
                //     //         transition: 'zoom',
                //     //         movable: true,
                //     //         maximizable: true
                //     //     }) // Customize options
                //     //     .setHeader(productName);
                //
                //     // Check if the data exists before assigning it to model-viewer
                //     if (data) {
                //         const modelViewer = document.getElementById('model-viewer');
                //         if (modelViewer) {
                //             modelViewer.setAttribute('src', data.model_3d_file || '');
                //             modelViewer.setAttribute('alt', data.model_alt || '');
                //             modelViewer.setAttribute('poster', data.model_poster || '');
                //             modelViewer.setAttribute('reveal', data.reveal || 'auto');
                //             modelViewer.setAttribute('loading', data.loading || 'auto');
                //             modelViewer.setAttribute('ar-modes', (data.ar_modes || []).join(' '));
                //             modelViewer.style.backgroundColor = data.poster_color || 'rgba(255,255,255,0)';
                //
                //             const scale = data.scale || 'auto'; // Default value if not defined
                //             modelViewer.setAttribute('ar-scale', scale); // Use "auto" or "fixed" as needed
                //         }
                //     }
                //
                // } else {
                //     console.error(response.data);
                // }

        });

    }
});







