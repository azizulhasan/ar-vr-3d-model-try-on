
import {useState} from "react";

import 'react-toastify/dist/ReactToastify.css';

import Settings from "./components/dashboard/settings/Settings";
import {ToastContainer} from "react-toastify";
import Features from "./components/dashboard/Features/Features";

export default function App() {
    const [activeTab, setActiveTab] = useState('Settings')
    const tabs = [
        { name: 'Settings', href: '#', current: true, component: 'Settings' },
        { name: 'Features', href: '#', current: false,  component: 'Features' },
        { name: 'Contact Us', href: 'https://atlasaidev.com/contact-us/', current: false,  component: 'Contact' },
    ]

    function classNames(...classes) {
        return classes.filter(Boolean).join(' ')
    }

    const handChange = (e, tab) => {
        e.preventDefault();
        if(tab.href !== '#') {
            window.open(tab.href, '_blank')
        }else{
            setActiveTab(tab.component)
        }

    }

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


        {/*<div className="art-grid art-grid-cols-1 art-hidden art-sm:block ">*/}
        {/*    /!* Use an "onChange" listener to redirect the user to the selected tab URL. *!/*/}
        {/*    <select*/}
        {/*        defaultValue={tabs.find((tab) => tab.current).name}*/}
        {/*        aria-label="Select a tab"*/}
        {/*        className="art-col-start-1 art-row-start-1 art-w-full art-appearance-none art-rounded-md art-bg-white art-py-2 art-pl-3 art-pr-8 art-text-base art-text-gray-900 art-outline art-outline-1 art--outline-offset-1 art-outline-gray-300 art-focus:outline art-focus:outline-2 art-focus:-outline-offset-2 art-focus:outline-indigo-600"*/}
        {/*    >*/}
        {/*        {tabs.map((tab) => (*/}
        {/*            <option key={tab.name}>{tab.name}</option>*/}
        {/*        ))}*/}
        {/*    </select>*/}
        {/*    icon*/}
        {/*</div>*/}
        <div className="art-md:block ">
            <div className="art-border-b art-border-gray-200">
                <nav aria-label="Tabs" className="art--mb-px art-flex art-space-x-8 art-no-underline">
                    {tabs.map((tab) => (
                        <a
                            key={tab.name}
                            href={tab.href}
                            onClick={(e)=>handChange(e,tab)}
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
            activeTab === 'Settings' ? <Settings/> : <Features/>
        }
    </>;
}

