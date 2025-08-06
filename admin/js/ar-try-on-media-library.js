document.addEventListener('DOMContentLoaded', function () {
    let mediaUploader;
    // Attach click event listener to elements with the class 'ar-try-on-open-media-library'
    document.querySelectorAll('.ar-try-on-open-media-library').forEach(function (button) {
        console.log(button)
        button.addEventListener('click', function (e) {
            e.preventDefault();

            // Get the previous sibling element
            let previousElementSibling = e.target.previousElementSibling;
            let name = previousElementSibling.name;

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
                previousElementSibling.value = attachment.url;
                wp.hooks.doAction('ar_try_on_on_select_model_file', {
                    name: name,
                    url: attachment.url
                });
            });

            // Open the media uploader
            mediaUploader.open();
        });
    });
});
