import React from "react";
import { __ } from '@wordpress/i18n';

const ArtModal = ({ title = __("Modal Title", "ar-vr-3d-model-try-on"), body = __("Modal body content...", "ar-vr-3d-model-try-on"), onClose, onExpand })=> {
    return (
        <div className="art-fixed art-inset-0 art-bg-black/50 art-flex art-items-center art-justify-center art-z-50">
            <div className="art-hidden art-bg-white art-rounded-lg art-shadow-lg art-w-11/12 art-max-w-lg art-flex art-flex-col art-relative art-fixed art-inset-0 art-w-full art-h-full art-max-w-none art-rounded-none"></div>
            <div className="art-bg-white art-rounded-lg art-shadow-lg art-w-11/12 art-max-w-lg art-flex art-flex-col art-relative">
                {/* Header */}
                <div className="art-flex art-items-center art-justify-between art-p-4 art-border-b art-border-gray-200">
                    <h2 className="art-text-lg art-font-semibold">{title}</h2>
                    <div className="art-flex art-gap-2">
                        {/* Expand Button */}
                        <button
                            type="button"
                            className="art-p-1 art-rounded hover:art-bg-gray-200"
                            onClick={onExpand}
                        >
                            <svg
                                className="art-w-5 art-h-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 4h6v6H4V4zM14 14h6v6h-6v-6zM4 14h6v6H4v-6zM14 4h6v6h-6V4z"
                                />
                            </svg>
                        </button>
                        {/* Close Button */}
                        <button
                            type="button"
                            className="art-p-1 art-rounded hover:art-bg-gray-200"
                            onClick={onClose}
                        >
                            <svg
                                className="art-w-5 art-h-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="art-p-4 art-flex-1 art-overflow-y-auto">{body}</div>

                {/* Footer */}
                <div className="art-flex art-justify-end art-p-4 art-border-t art-border-gray-200">
                    <button
                        type="button"
                        className="art-bg-gray-200 art-hover-bg-gray-300 art-text-gray-700 art-px-4 art-py-2 art-rounded"
                        onClick={onClose}
                    >
                        {__("Close", "ar-vr-3d-model-try-on")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArtModal;
