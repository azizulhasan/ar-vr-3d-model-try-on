import React from "react";
import { getURL, postWithoutImage } from "../../context/utilities";

export default function IntegrationSection({
  productModel,
  addField,
  removeField,
  handleChange,
  settings,
}) {
  const handleSubmit = async () => {
    // console.log(productModel);
    // console.log(settings)
    // 'tsk_IrIonIBYMdxL8KY5sNvPJ7XLYQY4OpDuCnjh-2gj9sA'
    const APIKEY = 'tsk_IrIonIBYMdxL8KY5sNvPJ7XLYQY4OpDuCnjh-2gj9sA';
    let headers = {}
    settings.ar_try_on_exclude_integration_api_headers.map(header => {
      headers[header.key] = header.value;
    });

    let body = {}
    productModel.exclude_integration_api_body.map(item => {
      body[item.key] = item.value;
    });
    let data_arr = {};
    data_arr['url'] = settings.ar_try_on_exclude_integration_api_url
    data_arr['headers'] = headers;
    data_arr['body'] = body
    console.log(data_arr)
    let formData = new FormData();
    formData.append('data', JSON.stringify(data_arr));
    postWithoutImage(getURL('generate_3d_model'), formData).then(
      (res) => {
        console.log(res)
        if(!res?.data?.data?.output?.generated_image && res?.data?.data?.task_id) {
          let responseData = {};
          let taskInterval = setInterval(async () =>{
            console.log(taskInterval)
            if(responseData?.data?.data?.output?.generated_image){
              clearInterval(taskInterval)
              taskInterval = null;
              return;
            }

            let formData2 = new FormData();
            data_arr.body.task_id = res?.data?.data?.task_id;
            console.log(data_arr)
            formData2.append('data', JSON.stringify(data_arr));
            // Default options are marked with *
            const response = await fetch(getURL('generate_3d_model'), {
              method: "POST", // *GET, POST, PUT, DELETE, etc.
              body: formData2, // body data type must match "Content-Type" header
              headers: {
                'X-WP-Nonce': ar_try_on.rest_nonce
              },
            });
            responseData = await response.json();
            console.log(responseData)
          },10000)
        }

      });


  };

  return (
    <div className="art-bg-gray-100 art-p-4 art-rounded">
      <h3 className="art-font-medium art-mb-4">Integration</h3>

      {/* Add new field button */}
      <button
        type="button"
        onClick={addField}
        className="art-mb-4 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border-none"
      >
        Add Body
      </button>

      {/* Dynamic rows */}
      {productModel.exclude_integration_api_body.map((field, index) => (
        <div key={index} className="art-flex art-gap-2 art-mb-4 art-flex-nowrap">
          <input
            type="text"
            placeholder="Key"
            value={field.key}
            onChange={(e) => handleChange(index, "key", e.target.value)}
            className="art-border art-rounded art-p-2 art-w-1/5"
          />

          <select
            value={field.type}
            onChange={(e) => handleChange(index, "type", e.target.value)}
            className="art-border art-rounded art-p-2 art-w-1/5"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="textarea">Textarea</option>
          </select>

          {field.type === "textarea" ? (
            <textarea
              placeholder="Value"
              value={field.value}
              onChange={(e) => handleChange(index, "value", e.target.value)}
              className="art-border art-rounded art-p-2 art-w-1/2"
              style={{ height: '100px' }}
            />
          ) : (
            <input
              type={field.type}
              placeholder="Value"
              value={field.value}
              onChange={(e) => handleChange(index, "value", e.target.value)}
              className="art-border art-rounded art-p-2 art-w-1/2"
            />
          )}

          <button
            type="button"
            onClick={() => removeField(index)}
            className="art-bg-blue-500 art-text-white art-px-2 art-rounded art-border-none"
          >
            ✕
          </button>

        </div>

      ))}
      <button type="button"
        onClick={handleSubmit}
        className="art-w-full art-mt-2 art-cursor-pointer art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border art-border-sky-500 ">
        Generate Model
      </button>
    </div>
  );
}
