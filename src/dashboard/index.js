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


let app = document.getElementById("ar_try_on_dashboard_ui")
if (app) {
    const root = createRoot(app);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}



{/*ADD PREFIX TO EVERY CLASS*/}
{/*in your editor (i used phpstorm ctrl+shift+f for find and replace in all files of a specific folder):*/}
{/*find  : (?<=class=["'][^"']*)([0-9a-zA-Z_-]+\s*)(?=[^"']*["'])*/}
{/*replace : tw-$1*/}{" "}