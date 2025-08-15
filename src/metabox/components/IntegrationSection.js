import React, { useState } from "react";

export default function IntegrationSection() {
    const [fields, setFields] = useState([{ key: "", value: "", type: "text" }]);

    const addField = () => {
        setFields([...fields, { key: "", value: "", type: "text" }]);
    };

    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const handleChange = (index, name, value) => {
        const updated = [...fields];
        updated[index][name] = value;
        setFields(updated);
    };

    return (
        <div className=" art-rounded art-p-4">
            <button
                type="button"
                onClick={addField}
                className="art-mb-4 art-px-4 art-py-2 art-bg-blue-500 art-text-white art-rounded art-border-none"
            >
                Add Body
            </button>

            {fields.map((field, index) => (
                <div key={index} className="art-flex art-gap-2 art-mb-4 art-flex-nowrap">
                    {/* Key Input */}
                    <input
                        type="text"
                        placeholder="Key"
                        value={field.key}
                        onChange={(e) => handleChange(index, "key", e.target.value)}
                        className="art-border art-rounded art-p-2 art-w-1/3"
                    />

                    {/* Type Selector */}
                    <select
                        value={field.type}
                        onChange={(e) => handleChange(index, "type", e.target.value)}
                        className="art-border art-rounded art-p-2 art-w-1/4"
                    >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="textarea">Textarea</option>
                    </select>

                    {/* Value Field */}
                    {field.type === "textarea" ? (
                        <textarea
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleChange(index, "value", e.target.value)}
                            className="art-border art-rounded art-p-2 art-w-1/3"
                        />
                    ) : (
                        <input
                            type={field.type}
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleChange(index, "value", e.target.value)}
                            className="art-border art-rounded art-p-2 art-w-1/3"
                        />
                    )}

                    {/* Delete Button */}
                    <button
                        type="button"
                        onClick={() => removeField(index)}
                        className=" art-bg-blue-500 art-text-white art-px-2 art-rounded art-border-none"
                    >
                        ✕
                    </button>
                </div>
                
            ))}

            <button>Save</button>
        </div>
    );
}
