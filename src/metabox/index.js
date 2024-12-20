import React from "react";
import ReactDOM from "react-dom";
import ARProductModelSettings from "./ARProductModelSettings";


let app = document.getElementById("ar_try_on_product_model_settings")
if (app) {
    ReactDOM.render(
        <React.StrictMode>
            <ARProductModelSettings />
        </React.StrictMode>,
        app
    );

}


