jQuery(function($){
    // Wait for DOM ready and for gallery to be present (tweak selector if theme differs)
    var attempt = 0;
    function insertBeforeGallery() {
        attempt++;
        var $galleryWrapper = $('.woocommerce-product-gallery, .woocommerce-product-gallery__wrapper').first();
        var $thumbnails = $('.woocommerce-product-gallery__wrapper, .woocommerce-product-thumbnails, .thumbnails').first();
        console.log($thumbnails.length)
        // Prefer inserting before the thumbnail container if found
        if ($thumbnails.length) {
            if ( ! $('.myplugin-before-gallery').length ) {
                $('<div class="myplugin-before-gallery"><img src="' + ar_try_on.img + '" alt="Extra image"/></div>').insertBefore($thumbnails);
            }
            return;
        }

        // Fallback: insert at top of gallery wrapper
        if ($galleryWrapper.length) {
            if ( ! $('.myplugin-before-gallery').length ) {
                $('<div class="myplugin-before-gallery"><img src="' + ar_try_on.img + '" alt="Extra image"/></div>').prependTo($galleryWrapper);
            }
            return;
        }

        // Retry a few times in case the gallery is created async
        if (attempt < 10) {
            setTimeout(insertBeforeGallery, 300);
        }
    }

    // Provide the image URL from localized script data
    if ( typeof ar_try_on !== 'undefined' ) {
        insertBeforeGallery();
    }
});
