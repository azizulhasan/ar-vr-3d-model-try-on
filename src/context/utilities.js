

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