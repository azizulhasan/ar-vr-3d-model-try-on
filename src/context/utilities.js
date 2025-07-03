

/**
 * Post data method.
 * @param {url} url api url
 * @param {method} method request type
 * @returns
 */
export const postWithoutImage = async (url = "", data = {}) => {
    // Default options are marked with *
    const response = await fetch(url, {
        // headers: {
        //   "Content-Type": "application/json",
        // },
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        body: data, // body data type must match "Content-Type" header
        headers: {
            'X-WP-Nonce': ar_try_on.rest_nonce
        },
    });
    const responseData = await response.json(); // parses JSON response into native JavaScript objects

    return responseData;
};


/**
 *
 * @param endpoint
 * @returns {string}
 */
export const getURL = (endpoint = '') => {
    return ar_try_on.api_url + ar_try_on.api_namespace + '/' + ar_try_on.api_version + '/' + endpoint;
}

export const getPostID = () => {
    // Parse the URL parameters
    const params = new URLSearchParams(window.location.search);

    // Get the 'post' parameter
    return  params.get('post');
}



function unsecuredCopyToClipboard()  {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy')
        alert('Copied')
    } catch (err) {
        console.error('Unable to copy to clipboard', err)
    }

    document.body.removeChild(textArea)
};

/**
 * Copy short Code
 */
export const copyshortcode =  (e)  =>{
    e.preventDefault();
    /* Get the text field */
    var copyText = document.getElementById("atlas_ar_shortcode_button");

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    if (window.isSecureContext && navigator.clipboard) {
        /* Copy the text inside the text field */
        navigator.clipboard
            .writeText(copyText.value)
            .then(() => {
                alert('Copied')
            })
            .catch((e) => {
                alert("Something went wrong! " + e);
                // toast('Something went wrong! ');
            });
    } else {
        unsecuredCopyToClipboard(copyText.value);
    }
};