import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css'; // Import Alertify styles
import 'alertifyjs/build/css/themes/default.css';
import {getURL, postWithoutImage} from "../../src/context/utilities";

document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    // Add event listener to the button
    const buttons = [...document.getElementsByClassName('ar_vr_3d_model_try_on')];


    if (buttons) {
        buttons.map(button => {
            button.addEventListener('click', async () => {
                // Retrieve the product_id from the button's data-product-id attribute
                const product_id = button.getAttribute('product-id');

                // Verify if product_id is defined
                if (!product_id) {
                    console.error('Product ID is missing');
                    return;
                }
                console.log(product_id)
                // Your custom HTML content
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
                        style="width: 100%; max-width: 600px; height: 400px;"
                    ></model-viewer>
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

                            alertify
                                .alert(productName, htmlContent)
                                .set({
                                    transition: 'zoom',
                                    movable: true,
                                    maximizable: true
                                }) // Customize options
                                .setHeader(productName);

                            // Check if the data exists before assigning it to model-viewer
                            if (data) {
                                const modelViewer = document.getElementById('model-viewer');
                                if (modelViewer) {
                                    modelViewer.setAttribute('src', data.model_3d_file || '');
                                    modelViewer.setAttribute('alt', data.model_alt || '');
                                    modelViewer.setAttribute('poster', data.model_poster || '');
                                    modelViewer.setAttribute('reveal', data.reveal || 'auto');
                                    modelViewer.setAttribute('loading', data.loading || 'auto');
                                    modelViewer.setAttribute('ar-modes', (data.ar_modes || []).join(' '));
                                    modelViewer.style.backgroundColor = data.poster_color || 'rgba(255,255,255,0)';

                                    const scale = data.scale || 'auto'; // Default value if not defined
                                    modelViewer.setAttribute('ar-scale', scale); // Use "auto" or "fixed" as needed
                                }
                            }

                        } else {
                            console.error(response.data);
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            });
        })
    }
});
