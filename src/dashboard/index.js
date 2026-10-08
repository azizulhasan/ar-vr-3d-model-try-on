// import React from "react";
// import ReactDOM from "react-dom";
// import App from "./App";
// let app = document.getElementById("ar_try_on_dashboard_ui")
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
import Wizard from "./wizard/Wizard";


let app = document.getElementById("ar_try_on_dashboard_ui")
if (app) {
    // AR-72: `&welcome=1` / `&welcome=pro` opens the setup wizard.
    const showWizard = !!(window.ar_try_on && ar_try_on.wizard && ar_try_on.wizard.active);
    const root = createRoot(app);
    root.render(
        <React.StrictMode>
            {showWizard ? <Wizard /> : <App />}
        </React.StrictMode>
    );
}