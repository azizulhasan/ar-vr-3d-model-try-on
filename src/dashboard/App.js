
import 'react-toastify/dist/ReactToastify.css';

import Settings from "./components/dashboard/settings/Settings";
import {ToastContainer} from "react-toastify";

export default function App() {
    // return <Dashboard />;
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
        <Settings/>
    </>;
}

