import { __ } from '@wordpress/i18n';

//wp block editor
const { InspectorControls } = wp.blockEditor;

//wp components
const { PanelBody } = wp.components;

const customizeButton = {
	namespace: 'tts/atlasvoice',
	object: {
		title: __('AtlasVoice1112'),
		description: __('Text to audio customize button.'),
		icon: 'controls-play',
		category: 'design',
		keywords: [
			'customize',
			'text-to-audio',
			'speech',
			'audio',
			'text-to-speech',
			'atlasvoice'
		],
		example: {},
		attributes: {
			backgroundColor: {
				type: 'string',
				default: '#184c53',
			},
			color: {
				type: 'string',
				default: '#ffffff',
			},
			width: {
				type: 'string',
				default: '100',
			},
			border: {
				type: 'string',
				default: '0',
			},
			custom_css: {
				type: 'string',
				default: '',
			},
		},

		edit: Customize,

		save: function (props) {
			return null;
		},
	},
};

function Customize(props) {
	const setBackgroundColor = (e) => {
		props.setAttributes({ backgroundColor: e.target.value });
	};
	const setColor = (e) => {
		props.setAttributes({ color: e.target.value });
	};
	const setWidth = (e) => {
		props.setAttributes({ width: e.target.value });
	};

	const setcustom_css = (e) => {
		props.setAttributes({ custom_css: e.target.value });
	};
	const { color, backgroundColor, width, border, custom_css } =
		props.attributes;

	return [
		<InspectorControls style={{ marginBottom: '40px' }}>
			<PanelBody
				className='tta_block_body'
				title={__('Customize Button')}>
				<div>
					<label htmlFor='backgroundColor'>
						{__('BackGround Color')}
					</label>
					<input
						type='color'
						name='backgroundColor'
						onChange={setBackgroundColor}
						id='backgroundColor'
						value={backgroundColor}
						title={__('Choose your color')}
					/>
				</div>
				<div>
					<label htmlFor='color'> {__('Text Color')}</label>
					<input
						type='color'
						name='color'
						onChange={setColor}
						id='color'
						value={color}
						title={__('Choose your color')}
					/>
				</div>
				<div>
					<label htmlFor='width'>{__('Button Width (%)')}</label>
					<input
						type='number'
						name='width'
						onChange={setWidth}
						id='width'
						min={'0'}
						max='100'
						value={width}
						title={__('Button Width')}
					/>
				</div>
				<div>
					<label htmlFor='custom_css'>{__('Custom CSS')}</label>
					<textarea
						name='custom_css'
						onChange={setcustom_css}
						value={custom_css ? custom_css : ''}
						placeholder={__('class selector .tta__listen_content')}
					/>
				</div>
			</PanelBody>
			<style
				dangerouslySetInnerHTML={{
					__html: [
						'.tta_block_body div input {',
						'float:right;',
						'height:35px;',
						'}',
						'.tta_block_body div {',
						'padding: 15px 0;',
						'border-bottom: 1px solid #d7d7d7;',
						'}',
						'.tta_block_body div:last-child {',
						'padding: 15px 0 30px;',
						'}',
					].join('\n'),
				}}></style>
		</InspectorControls>,
		<div className='tta_block'>
			<button
				id='tta__listen_content_block'
				className='tta__listen_content'
				onClick={(e) =>
					console.log('block_editor')
				}
				style={{
					backgroundColor: backgroundColor,
					color: color,
					width: width + '%',
					border: border,
				}}
				type='button'
				title={__('Text To Audio:  Tap to listen post.')}>
				{/* <span
					className='dashicons dashicons-controls-play'
					style={{
						lineHeight: '1.5;',
					}}></span> */}
				{__('Listen')}
			</button>
			<style
				dangerouslySetInnerHTML={{
					__html: [
						'button.tta__listen_content .dashicons {',
						'line-height: 1.5;',
						'}',
					].join('\n'),
				}}></style>
			<style>{custom_css}</style>
		</div>,
	];
}

export default customizeButton;
