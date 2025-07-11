import alertify from 'alertifyjs';

import { getURL, postWithoutImage, getPostID } from "../../src/context/utilities";


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
                    modalContent.id = 'ar_try_on_model_viewer';

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
                    wp.hooks.doAction('ar_try_on_pro_load_face_model', htmlContent, data);
                }

            } else {
                console.error(response.data);
            }
        })
        .catch((err) => {
            console.log(err);
        });
} else {
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
                                xr-environment
                                style="width: 100%; max-width: 600px; height: 400px;"
                            ></model-viewer>
                        </div>`;



    let formData = new FormData();
    formData.append('product_id', product_id);
    let model_settings = {}
    await postWithoutImage(getURL('get_model_and_settings'), formData)
        .then((response) => {
            if (response.success) {
                model_settings = response.data;
                document.getElementById('ar_try_on_preveiw').innerHTML = htmlContent

            } else {
                console.error(response.data);
            }
        })
        .catch((err) => {
            console.log(err);
        });
    wp.hooks.addAction('ar_try_on_preview_data', 'ar_try_on', function (data) {

        model_settings.model_3d_file = data.ar_try_on_file_android;
        model_settings.model_ios_file = data.ar_try_on_file_ios;
        model_settings.model_alt = data.ar_try_on_file_alt;
        model_settings.model_poster = data.ar_try_on_file_poster;
        model_settings.ar_placement = data.ar_try_on_ar_placement;

        // Check if the data exists before assigning it to model-viewer
        if (data.ar_try_on_ar_placement === 'floor' || data.ar_try_on_ar_placement === 'wall') {
            const modelViewer = document.getElementById('model-viewer');
            console.log({ modelViewer })

            if (modelViewer) {
                modelViewer.setAttribute('src', model_settings.model_3d_file || '');
                modelViewer.setAttribute('ios-src', model_settings.model_ios_file || '');
                modelViewer.setAttribute('alt', model_settings.model_alt || '');
                modelViewer.setAttribute('poster', model_settings.model_poster || '');
                modelViewer.setAttribute('reveal', model_settings.reveal || 'auto');
                modelViewer.setAttribute('loading', model_settings.loading || 'auto');
                modelViewer.setAttribute('ar-modes', (model_settings.ar_modes || []).join(' '));
                modelViewer.setAttribute('ar-placement', (model_settings.ar_placement || 'floor'));
                modelViewer.style.backgroundColor = model_settings.poster_color || 'rgba(255,255,255,0)';
                const scale = model_settings.scale || 'auto'; // Default value if not defined
                modelViewer.setAttribute('ar-scale', scale); // Use "auto" or "fixed" as needed
                if (model_settings.ar === "deactivate") {
                    modelViewer.removeAttribute('ar');
                }
                if (model_settings.xr_environment === "deactivate") {
                    modelViewer.removeAttribute('xr-environment');
                }


                // TODO: add functionality for this.
                // if(data.custom_button === "activate") {
                //     modelViewer.innerHTML =  `<button> ${data.custom_button_text || 'Activate Ar'} </button>` ;
                // }

            }
        } else {
            const htmlContent = `
                  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <button class="close-btn" id="closeModal">&times;</button>
      <h2>Modal Content</h2>
      <p>This is a custom modal with blurred background and white content area.</p>
    </div>
  </div>`;

            document.getElementById('ar_try_on_preveiw').innerHTML = htmlContent

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
                modalContent.id = 'ar_try_on_model_viewer';

                // Add close button
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-btn';
                closeBtn.textContent = 'Close';
                closeBtn.onclick = function () {
                    document.getElementById('ar_try_on_preveiw').removeChild(overlay);
                };

                // Add content to modal
                modalContent.innerHTML = '<h2>Modal Title</h2><p>This is a custom modal.</p>';
                modalContent.appendChild(closeBtn);

                // Append modal content to overlay
                overlay.appendChild(modalContent);

                // Append overlay to body
                document.getElementById('ar_try_on_preveiw').appendChild(overlay);


            }

            // Check if the data exists before assigning it to model-viewer
            if (data) {
                showModal()
                console.log({ data })
                wp.hooks.doAction('ar_try_on_pro_load_face_model', htmlContent, model_settings);
            }


        }

    });

}







