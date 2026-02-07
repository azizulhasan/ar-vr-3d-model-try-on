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

    // Base 3D model file types (free version)
    let allowedFileTypes = {
        glb: "model/gltf-binary",
        gltf: "model/gltf-binary",
        usdz: "model/vnd.pixar.usd",
    };

    // Add Pro version file types if Pro is active
    if (ar_try_on && ar_try_on.is_pro_active) {
        allowedFileTypes = {
            ...allowedFileTypes,
            obj: "model/obj",
            "3ds": "application/x-3ds",
            step: "application/step",
            stl: "application/vnd.ms-pki.stl",
            fbx: "application/octet-stream",
            "3dml": "text/vnd.in3d.3dml",
            dae: "application/collada+xml",
            wrl: "model/vrml",
            "3mf": "application/vnd.ms-3mfdocument",
            mtl: "model/mtl",
            bin: "application/octet-stream",
            hdr: "image/vnd.radiance",
        };
    }

    // Allow filtering via hooks
    allowedFileTypes = wp.hooks.applyFilters('atlas_ar_allowedFileTypes', allowedFileTypes);

    function isAllowedFileTypes (attachment) {
        const mimeType = attachment.mime; // or file.mime_type depending on version
        const extension = attachment.filename.split('.').pop().toLowerCase();
        if(allowedFileTypes.hasOwnProperty(extension) && allowedFileTypes[extension]) {
            return true;
        }

        return false;
    }

    function uploadModelFile(fieldName, field = '', isMultiple = false) {
        console.log({fieldName, field})
        // If the media uploader instance already exists, reopen it
        if (mediaUploader) {
            mediaUploader = null;
        }

        // Check if this is a 3D model field (src, ios_src, or variant model)
        const isModelField = fieldName === 'src' || fieldName === 'ios_src' || fieldName.startsWith('variant_');

        // Get allowed mime types for library filter
        const allowedMimeTypes = Object.values(allowedFileTypes);

        // Create a new media uploader instance
        mediaUploader = wp.media({
            title: isModelField ? 'Select or Upload 3D Model' : 'Select or Upload Media',
            button: {
                text: 'Use this media',
            },
            multiple: false,
            library: isModelField ? {
                type: allowedMimeTypes,
            } : {},
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
            let actionName = 'atlas_ar_on_select_model_file';
            if(isMultiple) {
                actionName = 'atlas_ar_on_select_multiple_model_file';
            }
            wp.hooks.doAction(actionName, {
                name: fieldName,
                url: attachment.url,
                sizes: attachment.sizes
            });

        });

        // Open the media uploader
        mediaUploader.open();
    }


    wp.hooks.addAction('atlas_ar_select_light_and_envirement_files', 'ar_try_on', function ({ name, field, isMultiple }) {
        uploadModelFile(name, field, isMultiple)
    });
});
