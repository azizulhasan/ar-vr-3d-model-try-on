import notify from "../../src/context/Notify";

document.addEventListener('DOMContentLoaded', function () {
    let mediaUploader;
    // Attach click event listener to elements with the class 'ar-try-on-open-media-library'
    // document.querySelectorAll('.ar-try-on-open-media-library').forEach(function (button) {


    //     button.addEventListener('click', function (e) {
    //         e.preventDefault();
    //                 // Get the previous sibling element
    //         let fieldName = e.target.getAttribute('data-name')
    //         uploadModelFile(fieldName)
    //     });


    // });

    const allowedFileTypes = wp.hooks.applyFilters('atlas_ar_allowedFileTypes', {
        glb: "model/gltf-binary",
        gltf: "model/gltf-binary",
        usdz: "model/vnd.pixar.usd",
    });

    function isAllowedFileTypes (attachment) {
        const mimeType = attachment.mime; // or file.mime_type depending on version
        const extension = attachment.filename.split('.').pop().toLowerCase();
        if(allowedFileTypes.hasOwnProperty(extension) && allowedFileTypes[extension]) {
            return true;
        }

        return false;
    }

    function uploadModelFile(fieldName, field = '') {
        console.log(fieldName)

        // If the media uploader instance already exists, reopen it
        if (mediaUploader) {
            mediaUploader = null;
        }

        // Create a new media uploader instance
        mediaUploader = wp.media({
            title: 'Select or Upload Media',
            button: {
                text: 'Use this media',
            },
            multiple: false, // Set to true if multiple selection is needed
        });

        // When a media file is selected, this function runs
        mediaUploader.on('select', function () {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            if(!isAllowedFileTypes(attachment) && (fieldName === 'src' || fieldName === 'ios_src') ) {
                alert(`This file format is not allowed. Please try to upload one of these files. ${Object.keys(allowedFileTypes).join(', ')}`)
                return;
            }
            if (field) {
                field.value = attachment.url;
            } else {
                document.getElementById(fieldName).value = attachment.url;
            }


            wp.hooks.doAction('atlas_ar_on_select_model_file', {
                name: fieldName,
                url: attachment.url,
                sizes: attachment.sizes
            });
        });

        // Open the media uploader
        mediaUploader.open();
    }


    wp.hooks.addAction('atlas_ar_select_light_and_envirement_files', 'ar_try_on', function ({ name, field }) {
        uploadModelFile(name, field)
    });
});
