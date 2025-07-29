import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { Fragment, useEffect, useRef } from '@wordpress/element';
import { useSelect, dispatch } from '@wordpress/data';
import {
    InspectorControls,
    MediaUpload,
    useBlockProps,
} from '@wordpress/block-editor';
import {
    PanelBody,
    TextControl,
    ToggleControl,
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption,
    TabPanel,
    RangeControl,
    DropdownMenu,
} from '@wordpress/components';
import classnames from 'classnames';

registerBlockType('atlas-ar/ar-try-on', {
    icon: 'universal-access',
    edit: ({ clientId, attributes, setAttributes }) => {
        const {
            glb,
            hdr,
            poster,
            shadowIntensity,
            autoRotate,
            cameraOrbit,
            zoom,
            tap,
            skyBox,
            blockClass,
            alignmentDesktop,
            alignmentTablet,
            alignmentMobile,
            widthDesktop,
            widthTablet,
            widthMobile,
            heightDesktop,
            heightTablet,
            heightMobile,
            blockStyle,
            posterType,
            hdrType,
            glbType,
            skyBoxType,
        } = attributes;

        const { device } = useSelect((select) => {
            const { getDeviceType } = select('core/editor');
            return { device: getDeviceType() };
        }, []);

        const { setDeviceType } = dispatch('core/editor');

        const blockProps = useBlockProps({
            className: classnames('bdt-atlas-ar', blockClass),
        });

        const prevAttr = useRef(attributes);

        useEffect(() => {
            const rand = clientId?.slice(-6);
            if (!blockClass) {
                setAttributes({ blockClass: `atlas-ar${rand}` });
            }
            if (
                blockClass &&
                JSON.stringify(attributes) !== JSON.stringify(prevAttr.current)
            ) {
                setAttributes({ blockClass: `atlas-ar${rand}` });
                prevAttr.current = attributes;
            }
        }, [clientId, JSON.stringify(attributes)]);

        useEffect(() => {
            const styles = (a) => {
                const b = a?.blockClass;
                return `
                    .${b}{
                        --atlas-ar-align-desktop: ${alignmentDesktop};
                        --atlas-ar-align-tablet: ${alignmentTablet};
                        --atlas-ar-align-mobile: ${alignmentMobile};
                        --atlas-ar-width-desktop: ${widthDesktop}px;
                        --atlas-ar-width-tablet: ${widthTablet}px;
                        --atlas-ar-width-mobile: ${widthMobile}px;
                        --atlas-ar-height-desktop: ${heightDesktop}px;
                        --atlas-ar-height-tablet: ${heightTablet}px;
                        --atlas-ar-height-mobile: ${heightMobile}px;
                    }
                `;
            };
            setAttributes({ blockStyle: styles(attributes) });
        }, [JSON.stringify(attributes), clientId]);

        const modelViewerAttrs = {
            src: glb,
            'environment-image': hdr,
            poster,
            'shadow-intensity': shadowIntensity || 1,
            'camera-controls': '',
            'touch-action': 'pan-y',
            'tone-mapping': 'neutral',
            'auto-rotate': autoRotate ? '' : undefined,
            'camera-orbit': cameraOrbit,
            'disable-zoom': zoom,
            'disable-tap': tap,
            'skybox-image': skyBox,
        };

        const ResponsiveWrapper = ({ children }) => {
            let icon = (
                <svg viewBox="0 0 24 24">
                    <path d="M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z" />
                </svg>
            );
            if (device === 'Tablet') {
                icon = (
                    <svg viewBox="0 0 24 24">
                        <path d="M17 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H7c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h10c.3 0 .5.2.5.5v12zm-7.5-.5h4V16h-4v1.5z" />
                    </svg>
                );
            }
            if (device === 'Mobile') {
                icon = (
                    <svg viewBox="0 0 24 24">
                        <path d="M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12zm-4.5-.5h2V16h-2v1.5z" />
                    </svg>
                );
            }
            return (
                <div className="atlas-ar-blocks-responsive">
                    <DropdownMenu
                        icon={icon}
                        controls={[
                            { icon, onClick: () => setDeviceType('Desktop') },
                            { icon, onClick: () => setDeviceType('Tablet') },
                            { icon, onClick: () => setDeviceType('Mobile') },
                        ]}
                    />
                    {children}
                </div>
            );
        };

        return (
            <Fragment>
                <InspectorControls>
                    <TabPanel
                        tabs={[
                            { name: 'content', title: __('Content', 'atlas-ar') },
                            { name: 'style', title: __('Style', 'atlas-ar') },
                        ]}
                    >
                        {(tab) => {
                            switch (tab.name) {
                                case 'content':
                                    return (
                                        <Fragment>
                                            <PanelBody title={__('Content')}>
                                                {/* Content settings like model, poster, etc */}
                                            </PanelBody>
                                            <PanelBody
                                                title={__('Camera Settings', 'atlas-ar')}
                                                initialOpen={false}
                                            >
                                                <ToggleControl
                                                    label={__('Auto Rotate', 'atlas-ar')}
                                                    checked={autoRotate}
                                                    onChange={(v) => setAttributes({ autoRotate: v })}
                                                />
                                                <TextControl
                                                    label={__('Shadow Intensity', 'atlas-ar')}
                                                    value={shadowIntensity}
                                                    onChange={(v) => setAttributes({ shadowIntensity: v })}
                                                />
                                                <TextControl
                                                    label={__('Camera Orbit', 'atlas-ar')}
                                                    value={cameraOrbit}
                                                    placeholder="45deg 55deg 4m"
                                                    onChange={(v) => setAttributes({ cameraOrbit: v })}
                                                />
                                                <ToggleControl
                                                    label={__('Disable Zoom', 'atlas-ar')}
                                                    checked={zoom}
                                                    onChange={(v) => setAttributes({ zoom: v })}
                                                />
                                                <ToggleControl
                                                    label={__('Disable Tap', 'atlas-ar')}
                                                    checked={tap}
                                                    onChange={(v) => setAttributes({ tap: v })}
                                                />
                                            </PanelBody>
                                        </Fragment>
                                    );
                                case 'style':
                                    return (
                                        <PanelBody title={__('Canvas', 'atlas-ar')}>
                                            <ResponsiveWrapper>
                                                <ToggleGroupControl
                                                    label={__('Alignment', 'atlas-ar')}
                                                    value={attributes[`alignment${device}`]}
                                                    isBlock
                                                    isDeselectable
                                                    onChange={(v) =>
                                                        setAttributes({ [`alignment${device}`]: v })
                                                    }
                                                >
                                                    <ToggleGroupControlOption
                                                        value="left"
                                                        label="L"
                                                    />
                                                    <ToggleGroupControlOption
                                                        value="center"
                                                        label="C"
                                                    />
                                                    <ToggleGroupControlOption
                                                        value="right"
                                                        label="R"
                                                    />
                                                </ToggleGroupControl>
                                            </ResponsiveWrapper>
                                            <ResponsiveWrapper>
                                                <RangeControl
                                                    label={__('Width (px)', 'atlas-ar')}
                                                    value={attributes[`width${device}`]}
                                                    onChange={(v) =>
                                                        setAttributes({ [`width${device}`]: v })
                                                    }
                                                    min={100}
                                                    max={1000}
                                                />
                                            </ResponsiveWrapper>
                                            <ResponsiveWrapper>
                                                <RangeControl
                                                    label={__('Height (px)', 'atlas-ar')}
                                                    value={attributes[`height${device}`]}
                                                    onChange={(v) =>
                                                        setAttributes({ [`height${device}`]: v })
                                                    }
                                                    min={100}
                                                    max={1000}
                                                />
                                            </ResponsiveWrapper>
                                        </PanelBody>
                                    );
                            }
                        }}
                    </TabPanel>
                </InspectorControls>
                {blockStyle && <style>{blockStyle}</style>}
                <div {...blockProps}>
                    <model-viewer ar {...modelViewerAttrs} />
                </div>
            </Fragment>
        );
    },
    save: ({ attributes }) => {
        const blockProps = useBlockProps.save({
            className: classnames('bdt-atlas-ar', attributes?.blockClass),
        });
        const outputAttrs = {
            src: attributes?.glb,
            'environment-image': attributes?.hdr,
            poster: attributes?.poster,
            'shadow-intensity': attributes?.shadowIntensity || 1,
            'camera-controls': '',
            'touch-action': 'pan-y',
            'tone-mapping': 'neutral',
            'auto-rotate': attributes?.autoRotate ? '' : undefined,
            'camera-orbit': attributes?.cameraOrbit,
            'disable-zoom': attributes?.zoom,
            'disable-tap': attributes?.tap,
            'skybox-image': attributes?.skyBox,
        };
        return (
            <Fragment>
                {attributes?.blockStyle && <style>{attributes?.blockStyle}</style>}
                <div {...blockProps}>
                    <model-viewer ar {...outputAttrs} />
                </div>
            </Fragment>
        );
    },
});
