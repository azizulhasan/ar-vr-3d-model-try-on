import alertify from 'alertifyjs';

import { getURL, postWithoutImage, getPostID, setModelAttributes } from "../../src/context/utilities";


const product_id = getPostID();

console.log({ product_id })
// Verify if product_id is defined
if (!product_id) {
    console.error('Product ID is missing');
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
                    modalContent.id = 'atlas_ar_model_viewer';

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
                    wp.hooks.doAction('atlas_ar_pro_load_face_model', htmlContent, data);
                }

            } else {
                console.error(response.data);
            }
        })
        .catch((err) => {
            console.log(err);
        });
} else {
    // TODO: user should add custom class for there own sake.
    const htmlContent = `
                <style id="model-viewer-style"></style>
                        <div style="display: flex; justify-content: center; height: 100%;">
                            <model-viewer 
                                id="model-viewer"
                                class="atlas_ar_model_viewer"
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
                                style="width: 100%;max-width:600px; height: 400px;"
                            ></model-viewer>
                        </div>`;




    let model_settings = {}
    let InterVal = setInterval(async () => {
        if (document.getElementById('atlas_ar_preveiw')) {
            document.getElementById('ATLAS_AR_preveiw').innerHTML = htmlContent
            clearInterval(InterVal)
        }
    }, 10)



    wp.hooks.addAction('ATLAS_AR_preview_data', 'ar_try_on', function (data) {

        model_settings = { ...model_settings, ...data }
        console.log(model_settings)

        // Check if the data exists before assigning it to model-viewer
        if (model_settings) {
            const modelViewer = document.querySelectorAll('.atlas_ar_model_viewer')[0]
            if (modelViewer) {
                setModelAttributes(modelViewer, model_settings)

            }


        }
    });


}







