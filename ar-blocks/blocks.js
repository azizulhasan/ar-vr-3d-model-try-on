// Customize button
import customizeButton from './atlasvoice/atlasvoice';
import ARTryOn from './ar-try-on/index';

let blocks = [customizeButton];
blocks.push(ARTryOn)
// Register blocks.
blocks.map((block) => {
	wp.blocks.registerBlockType(block.namespace, block.object);
});
