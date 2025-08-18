import React from "react";

export default function IntegrationSection({ 
    fields, 
    addField, 
    removeField, 
    handleChange,
 }) {
        const handleSubmit = async () => {
            console.log( fields);
            
            

        async function generate3DModelFromHF(prompt) {
                        console.log( prompt);

            const response = await fetch("https://hysts-shap-e.hf.space/gradio_api/queue/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({data: [prompt],
                        event_data: null,
                        fn_index: 2,
                        trigger_id: 7,
                        session_hash: "qyyifkz574s",
                    })
            });
           const result = await response.json();
            console.log({result});

            // The output usually looks like result.data[0].url OR a base64 file
            // const modelUrl = result?.data[0]?.url || result?.data[0]; 
            // console.log(modelUrl)
            const response2 = await fetch("https://hysts-shap-e.hf.space/gradio_api/queue/data?session_hash=qyyifkz574s", {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            } );

            // const result2 = await response2.json();
            console.log({response2});

             const response3 = await fetch("https://hysts-shap-e.hf.space/gradio_api/queue/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({data: [prompt],
                        event_data: null,
                        fn_index: 3,
                        trigger_id: 7,
                        session_hash: "qyyifkz574s",
                    })
            });
           const result3 = await response3.json();
            console.log({result3});

            // The output usually looks like result.data[0].url OR a base64 file
            // const modelUrl = result?.data[0]?.url || result?.data[0]; 
            // console.log(modelUrl)
            const response4 = await fetch("https://hysts-shap-e.hf.space/gradio_api/queue/data?session_hash=qyyifkz574s", {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            } );

            // const result4 = await response4.json();
            console.log({response4});

      
            // return modelUrl; // .glb file
        }

        let model = await generate3DModelFromHF('a dog')
        console.log({model})

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
      {fields.map((field, index) => (
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
