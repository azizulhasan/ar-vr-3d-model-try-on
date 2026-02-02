import React from 'react';
import { __ } from '@wordpress/i18n';

/**
 * Welcome Component
 * 
 * Displays the welcome screen with plugin information, video, and support options
 * 
 * @since 1.8.0
 */
export default function Welcome() {
    return (
        <div className="art-w-full art-max-w-7xl art-mx-auto">
            <div className="art-grid art-grid-cols-1 lg:art-grid-cols-3 art-gap-6">
                {/* Left Column - Main Content (2/3 width) */}
                <div className="lg:art-col-span-2 art-space-y-6">
                    {/* Welcome Header */}
                    <div>
                        <h1 
                            className="art-text-4xl art-font-bold art-mb-4"
                            // style={{ color: 'var(--theme-text)' }}
                        >
                            {__('Welcome to AtlasAR 3D Model Viewer', 'ar-vr-3d-model-try-on')}
                        </h1>
                        <p 
                            className="art-text-base art-leading-relaxed"
                            // style={{ color: 'var(--theme-text)', opacity: 0.8 }}
                        >
                          {__('Easily display interactive 3D models on the web. Supported File type .glb, .gltf, obj 3ds stl ply off 3dm fbx dae wrl 3mf amf ifc brep step iges fcstd bim', 'ar-vr-3d-model-try-on')}
                        </p>
                    </div>

                    {/* Video Container */}
                    <div 
                        className="art-rounded-lg art-overflow-hidden art-shadow-lg"
                        style={{ 
                            backgroundColor: 'var(--theme-accent)',
                            aspectRatio: '16/9'
                        }}
                    >
                        <iframe
                            className="art-w-full art-h-full"
                            src="https://www.youtube.com/embed/1WgR-xUMHa0"
                            title={__('3D Viewer Plugin for WordPress | WooCommerce 3D Viewer For Products', 'ar-vr-3d-model-try-on')}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>

                    {/* Plugin Info */}
                    <div 
                        className="art-flex art-items-center art-gap-4 art-p-4 art-rounded-lg"
                        style={{ backgroundColor: 'var(--theme-accent)' }}
                    >
                        <div className="art-flex-shrink-0">
                            <div 
                                className="art-w-16 art-h-16 art-rounded art-flex art-items-center art-justify-center art-text-2xl"
                                style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
                            >
                            <img 
                                    className="art-w-full art-h-full art-object-contain"
                                    srcSet="https://ps.w.org/ar-vr-3d-model-try-on/assets/icon-128x128.gif?rev=3219775, https://ps.w.org/ar-vr-3d-model-try-on/assets/icon-256x256.gif?rev=3219775 2x"
                                    src="https://ps.w.org/ar-vr-3d-model-try-on/assets/icon-256x256.gif?rev=3219775"
                                    alt={__('3D Viewer Plugin Icon', 'ar-vr-3d-model-try-on')}
                                />
                            </div>
                        </div>
                        <div className="art-flex-1">
                            <h3 
                                className="art-text-lg art-font-semibold art-mb-1"
                                style={{ color: 'var(--theme-text)' }}
                            >
                                 {__('AtlasAR 3D Model Viewer – Display Interactive 3D Models', 'ar-vr-3d-model-try-on')}
                            </h3>
                            <p 
                                className="art-text-sm"
                                style={{ color: 'var(--theme-text)', opacity: 0.7 }}
                            >
                                 {__('By', 'ar-vr-3d-model-try-on')} <a 
                                    href="https://atlasaidev.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="art-text-blue-500 hover:art-underline"
                                >
                                    {__('AtlasAiDev','ar-vr-3d-model-try-on')}
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="art-flex art-gap-4 art-flex-wrap">
                        <a
                            href="https://wpaugmentedreality.com/3d-viewer-3d-model-viewer-augmented-reality-atlasar-pricing/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="art-px-6 art-py-3 art-rounded-md art-font-medium art-text-white art-bg-orange-500 hover:art-bg-orange-600 hover:art-text-white art-transition-colors art-no-underline art-cursor-pointer"
                        >
                             {__('Buy Now', 'ar-vr-3d-model-try-on')}
                        </a>
                        <a
                            href="https://wpaugmentedreality.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="art-px-6 art-py-3 art-rounded-md art-font-medium art-text-white art-bg-blue-500 hover:art-bg-blue-600 hover:art-text-white art-transition-colors art-no-underline art-cursor-pointer"
                        >
                           {__('Learn More', 'ar-vr-3d-model-try-on')}
                        </a>
                    </div>
                </div>

                {/* Right Column - Support Cards (1/3 width) */}
                <div className="lg:art-col-span-1 art-space-y-6">
                    {/* Need Assistance Card */}
                    <div 
                        className="art-p-6 art-rounded-lg art-shadow-md"
                        style={{ 
                            backgroundColor: 'var(--theme-accent)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <h3 
                            className="art-text-xl art-font-semibold art-mb-3"
                            style={{ color: 'var(--theme-text)' }}
                        >
                             {__('Need any Assistance?', 'ar-vr-3d-model-try-on')}
                        </h3>
                        <p 
                            className="art-text-sm art-mb-4 art-leading-relaxed"
                            style={{ color: 'var(--theme-text)', opacity: 0.8 }}
                        >
                            {__('Our Expert Support Team is always ready to help you out promptly.', 'ar-vr-3d-model-try-on')}
                        </p>
                        <a
                            href="https://wpaugmentedreality.com/contact-us/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="art-block art-w-1/2 art-p-2 art-rounded-md art-font-medium art-text-center art-text-white art-bg-blue-500 hover:art-bg-blue-600 hover:art-text-white art-transition-colors art-no-underline art-cursor-pointer"
                        >
                        {__('Contact Support', 'ar-vr-3d-model-try-on')}
                        </a>
                    </div>

                    {/* Looking for Documentation Card */}
                    <div 
                        className="art-p-6 art-rounded-lg art-shadow-md"
                        style={{ 
                            backgroundColor: 'var(--theme-accent)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <h3 
                            className="art-text-xl art-font-semibold art-mb-3"
                            style={{ color: 'var(--theme-text)' }}
                        >
                          {__('Looking for Documentation?', 'ar-vr-3d-model-try-on')}
                        </h3>
                        <p 
                            className="art-text-sm art-mb-4 art-leading-relaxed"
                            style={{ color: 'var(--theme-text)', opacity: 0.8 }}
                        >
                            {__('We have detailed documentation on every aspects of the plugin.', 'ar-vr-3d-model-try-on')}
                        </p>
                        <a
                            href="https://wpaugmentedreality.com/docs/3d-model-viewer/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="art-block art-w-1/2 art-p-2 art-rounded-md art-font-medium art-text-center art-text-white art-bg-blue-500 hover:art-bg-blue-600 hover:art-text-white art-transition-colors art-no-underline art-cursor-pointer"
                        >
                             {__('Documentation', 'ar-vr-3d-model-try-on')}
                        </a>
                    </div>

                    {/* Liked This Plugin Card */}
                    <div 
                        className="art-p-6 art-rounded-lg art-shadow-md"
                        style={{ 
                            backgroundColor: 'var(--theme-accent)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <h3 
                            className="art-text-xl art-font-semibold art-mb-3"
                            style={{ color: 'var(--theme-text)' }}
                        >
                              {__('Liked This Plugin?', 'ar-vr-3d-model-try-on')}
                        </h3>
                        <p 
                            className="art-text-sm art-mb-4 art-leading-relaxed"
                            style={{ color: 'var(--theme-text)', opacity: 0.8 }}
                        >
                             {__('Glad to know that, you can support us by leaving a 5 ⭐ rating.', 'ar-vr-3d-model-try-on')}
                        </p>
                        <a
                            href="https://wordpress.org/plugins/ar-vr-3d-model-try-on/#reviews"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="art-block art-w-1/2 art-p-2 art-rounded-md art-font-medium art-text-center art-text-white art-bg-blue-500 hover:art-bg-blue-600 hover:art-text-white art-transition-colors art-no-underline art-cursor-pointer"
                        >
                            {__('Rate the Plugin', 'ar-vr-3d-model-try-on')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}