
document.addEventListener('DOMContentLoaded', function () {
	// Create a dialog element
	const dialog = document.getElementById('dialog');
	const arVrButton = document.getElementById('ar_vr_3d_model_try_on');

	if (dialog) {
		// Set up the dialog element
		dialog.style.display = 'none';
		dialog.style.maxWidth = '660px';
		dialog.style.width = 'auto';
		dialog.style.margin = '0 auto';
		dialog.style.background = 'white';
		dialog.style.padding = '20px';
		dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
		dialog.style.position = 'fixed';
		dialog.style.top = '50%';
		dialog.style.left = '50%';
		dialog.style.transform = 'translate(-50%, -50%)';
		dialog.style.zIndex = '1000';
		dialog.style.border = '2px black';
	}

	// Function to open the dialog
	function openDialog() {
		if (dialog) {
			dialog.style.display = 'block';
		}
	}

	// Function to close the dialog (optional if you want a close button)
	function closeDialog() {
		if (dialog) {
			dialog.style.display = 'none';
		}
	}

	// Add a click event listener to the button
	if (arVrButton) {
		arVrButton.addEventListener('click', function () {
			openDialog();
		});
	}

	// Close the dialog when clicking outside of it
	document.addEventListener('click', function (event) {
		if (dialog && dialog.style.display === 'block' && !dialog.contains(event.target) && event.target !== arVrButton) {
			closeDialog();
		}
	});
});
