import React from "react";
import { createRoot } from "react-dom/client";
import ARProductModelSettings from "./ARProductModelSettings";


let app = document.getElementById("ar_try_on_product_model_settings")
if (app) {
    const root = createRoot(app);
    root.render(
        <React.StrictMode>
            <ARProductModelSettings />
        </React.StrictMode>
    );
}


