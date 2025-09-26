import {useEffect, useState} from "react";


import Settings from "./components/dashboard/settings/Settings";
import {ToastContainer} from "react-toastify";
import Features from "./components/dashboard/Features/Features";
import Integration from "./components/dashboard/Integration/Integration";
import Documentation from "./components/dashboard/Documentation/Documentation";
import {getAPITypes, getURL, isDifferent, postWithoutImage} from "../context/utilities";
import toast from '../context/Notify';
import notify from "../context/Notify";


export default function App() {
    const [activeTab, setActiveTab] = useState('Settings');
    const [authType, setAuthType] = useState("Bearer");
    const [settings, setSettings] = useState({
        ar_try_on_display_button_automatically: 'yes',
        ar_try_on_allowed_post_types: ['post'],
        ar_try_on_wc_hook_position: "3",
        ar_try_on_single_product_tabs: "yes",
        ar_try_on_loading_type: "auto",
        ar_try_on_reveal_type: "auto",
        ar_try_on_poster_color: "rgba(78,186,79,0)",
        ar_try_on_ar: "activate",
        ar_try_on_ar_modes: ["webxr", 'scene-viewer', "quick-look"],
        ar_try_on_ar_scale: "auto",
        ar_try_on_xr_environment: "activate",
        ar_try_on_ar_button: "deactivate",
        ar_try_on_ar_button_text: "Activate AR",
        ar_try_on_ar_button_background_color: "#3a3a3a",
        ar_try_on_ar_button_text_color: "#ffffff",
        ar_try_on_enable_qr_code: 'yes',
        ar_try_on_clear_cache: false,
        ar_try_on_ar_demo: {},
        ar_try_on_exclude_integration_api_name: '',
        ar_try_on_exclude_integration_api_url: '',
        ar_try_on_exclude_integration_api_headers: [
            {
                key: "Authorization",
                value: ""
            },
            {key: 'Content-Type', value: 'application/json'},
        ],
    });
    const [previousSettings, setPreviousSettings] = useState(null)
    const tabs = [
        {name: 'Settings', href: '#', current: true, component: 'Settings'},
        {name: 'Integration', href: '#', current: false, component: 'Integration'},
        {name: 'Features', href: '#', current: false, component: 'Features'},
        {name: 'Documentation', href: '#', current: false, component: 'Documentation'},
        {name: 'Contact Us', href: 'https://wpaugmentedreality.com/contact-us/', current: false, component: 'Contact'},

    ]
    const [headers, setHeaders] = useState([]);
    const allApi = getAPITypes('all');
    const [currentApi, setCurrentAPI] = useState(getAPITypes(settings?.ar_try_on_exclude_integration_api_name || 'tripo3d'))

    useEffect(() => {
        /**
         * Get data from and display to table.
         */
        let formData = new FormData();
        formData.append('method', 'get');
        postWithoutImage(getURL('settings'), formData).then(
            (res) => {

                let finalSettings = {...settings, ...res.data};
                if(!finalSettings?.ar_try_on_exclude_integration_api_name) {
                    finalSettings.ar_try_on_exclude_integration_api_name = currentApi.id
                    finalSettings.ar_try_on_exclude_integration_api_url = currentApi.url
                    console.log(currentApi)
                    console.log(finalSettings)
                }
                setPreviousSettings(finalSettings)
                setSettings(finalSettings);
            });
    }, []);

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    const handleTabChange = (e, tab) => {
        e.preventDefault();
        if (tab.href !== '#') {
            window.open(tab.href, '_blank')
        } else {
            setActiveTab(tab.component)
        }
    }

    /**
     * handle change
     * @param {*} e
     */
    const handleChange = (e, targetName = '') => {

        let value = '';
        if (Array.isArray(e)) {
            value = e;

            if (targetName === 'ar_try_on_allowed_post_types' && value.length > 1) {
                toast('Multiple post type is only available in the pro version', 'error')
                return;
            }
            setSettings({
                ...settings,
                ...{[targetName]: value},
            });
            return;
        } else {
            value = e.target.value
        }


        if (targetName) {
            e.target.name = targetName;
        }

        if (e.target.name == 'ar_try_on_ar_modes') {
            let status = e.target.checked
            let clonedVal = JSON.parse(JSON.stringify(settings));
            let tempVal = clonedVal.ar_try_on_ar_modes
            if (status) {
                tempVal.push(value)
                value = tempVal
            } else {
                if (tempVal.includes(value)) {
                    tempVal = tempVal.filter(item => item != value);
                }
                value = tempVal
            }

        }

        if (!e.target.name) return;

        if(e.target.name === 'ar_try_on_exclude_integration_api_name' && e.target.value !== 'tripo3d') {
            notify('API switch is available in pro version', 'warn')
            return;
        }

        console.log({name: e.target.name, value})
        setSettings({
            ...settings,
            ...{[e.target.name]: value},
        });
    };

    const handleHeaderChange = (index, field, value) => {
        const updated = [...settings.ar_try_on_exclude_integration_api_headers];
        updated[index][field] = value;
        if(field === 'value' && updated[index]?.key === 'Authorization') {
            setSettings({...settings, ...{
                ar_try_on_exclude_integration_api_name: currentApi.id,
                ar_try_on_exclude_integration_api_url: currentApi.url
            }})
        }else{
            setSettings({...settings, ...{ar_try_on_exclude_integration_api_headers: updated}})
        }
    };


    /**
     * Handle form Submit
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        let tempSettings = structuredClone(settings);

        if (tempSettings?.ar_try_on_exclude_integration_api_name && tempSettings?.ar_try_on_exclude_integration_api_url) {
            tempSettings.ar_try_on_exclude_integration_api_headers.forEach((header, index) => {
                if (header.key === '' && header.value === '') {
                    alert('Please fill all of the API headers with proper value');
                    return;
                }

                if (header.key === 'Authorization' && header.value === '') {
                    tempSettings.ar_try_on_exclude_integration_api_name = '';
                    tempSettings.ar_try_on_exclude_integration_api_url = '';
                } else if (header.value === '') {
                    tempSettings.ar_try_on_exclude_integration_api_headers.splice(index, 1);
                }
            });
        }
        console.log({tempSettings})

        let hasValueChanged = isDifferent(previousSettings, tempSettings);
        if (!hasValueChanged) {
            notify('No changes detected', 'info',{
                autoClose: 5000,
            })
            return;
        }

        let formData = new FormData();
        formData.append('fields', JSON.stringify(tempSettings));
        formData.append('method', 'post');
        formData.append('has_value_changed', 'all');
        postWithoutImage(getURL('settings'), formData)
            .then((res) => {
                setSettings(res.data);
                toast('Successfully Saved.', 'info')
            })
            .catch((err) => {
                console.log(err);
            });
    };

    return <>
        <ToastContainer
            position='top-right'
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
        />
        <div className="art-md:block ">
            <div className="art-border-b art-border-gray-200">
                <nav aria-label="Tabs" className="art--mb-px art-flex art-space-x-8 art-no-underline">
                    {tabs.map((tab) => (
                        <a
                            key={tab.name}
                            href={tab.href}
                            onClick={(e) => handleTabChange(e, tab)}
                            aria-current={tab.current ? 'page' : undefined}
                            className={classNames(
                                tab.current
                                    ? 'art-border-indigo-500 art-text-indigo-600 art-no-underline'
                                    : 'art-border-transparent art-text-gray-500 art-hover:border-gray-300 art-hover:text-gray-700 art-no-underline',
                                'art-whitespace-nowrap art-border-b-2 art-px-1 art-py-4 art-text-sm art-font-medium art-no-underline',
                            )}
                        >
                            {tab.name}
                        </a>
                    ))}
                </nav>
            </div>
            {/*TODO:: Add plugin version*/}
            {/*<div className="art-absolute art-inset-y-0 art-right-0 art-flex art-items-center art-pr-2 art-sm:static art-sm:inset-auto art-sm:ml-6 art-sm:pr-0">1.0.8</div>*/}
        </div>

        {
            activeTab === 'Settings' &&
            <Settings setHeaders={setHeaders} settings={settings} handleChange={handleChange}/>
        }
        {
            activeTab === 'Features' && <Features/>
        }
        {
            activeTab === 'Integration' &&
            <Integration setCurrentAPI={setCurrentAPI} currentApi={currentApi} allApi={allApi} setSettings={setSettings} settings={settings} authType={authType} setAuthType={setAuthType}
                         handleChange={handleChange} handleHeaderChange={handleHeaderChange}/>
        }
        {activeTab === 'Documentation' && <Documentation/>}

        {/* Submit Button */}
        {(activeTab !== 'Documentation' && activeTab !== 'Features') && (
            <div className="art-space-y-2">
                <button
                    onClick={handleSubmit}
                    className="art-block art-cursor-pointer art-w-full art-p-2 art-rounded art-bg-blue-500 art-text-white art-border art-border-sky-500"
                >
                    Save
                </button>
            </div>
        )}
    </>;
}

