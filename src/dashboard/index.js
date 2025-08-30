// import React from "react";
// import ReactDOM from "react-dom";
// import App from "./App";
// let app = document.getElementById("ATLAS_AR_dashboard_ui")
// if (app) {
//     ReactDOM.render(
//         <React.StrictMode>
//             <App />
//         </React.StrictMode>,
//         app
//     );
// }

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";


let app = document.getElementById("ATLAS_AR_dashboard_ui")
if (app) {
    const root = createRoot(app);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}