document.addEventListener('DOMContentLoaded', function () {
    let mediaUploader;
    // Attach click event listener to elements with the class 'ar-try-on-open-media-library'
    document.querySelectorAll('.ar-try-on-open-media-library').forEach(function (button) {
        

        button.addEventListener('click', function (e) {
            e.preventDefault();
                    // Get the previous sibling element
            let fieldName = e.target.getAttribute('data-name')
            uploadModelFile(fieldName)
        });

           
    });

    function uploadModelFile(fieldName, field = ''){
            
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
                console.log('Selected file URL:', attachment.url);
                if(field) {
                    field.value = attachment.url;
                }else{
                    document.getElementById(fieldName).value = attachment.url;
                }
                wp.hooks.doAction('ar_try_on_on_select_model_file', {
                    name: fieldName,
                    url: attachment.url
                });
            });

            // Open the media uploader
            mediaUploader.open();
    }


    wp.hooks.addAction('ar_try_on_select_light_and_envirement_files', 'ar_try_on', function ({name, field}) {
            uploadModelFile(name, field)
        });
});
