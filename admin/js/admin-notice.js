/**
 * Admin Notice JavaScript
 *
 * Handles notice dismissal and action tracking
 *
 * @since 1.8.0
 */

(function($) {
	'use strict';

	$(document).ready(function() {

		/**
		 * Handle notice dismissal
		 */
		$('.ar-notice-dismiss').on('click', function(e) {
			e.preventDefault();

			var $notice = $(this).closest('.notice');
			var noticeId = $(this).data('notice-id');

			// Send AJAX request to dismiss notice
			$.post(arNoticeData.ajaxurl, {
				action: 'atlas_ar_dismiss_notice',
				nonce: arNoticeData.nonce,
				notice_id: noticeId
			}, function(response) {
				if (response.success) {
					// Fade out and remove notice
					$notice.fadeOut(300, function() {
						$(this).remove();
					});
				}
			});
		});

		/**
		 * Handle action button clicks
		 */
		$('.ar-notice-action-btn').on('click', function(e) {
			e.preventDefault();

			var $button = $(this);
			var noticeId = $button.data('notice-id');
			var actionName = $button.data('action');
			var originalText = $button.html();

			// Disable button and show loading state
			$button.prop('disabled', true)
				.html('<span class="dashicons dashicons-update-alt" style="animation: rotation 1s infinite linear; margin-top: 3px;"></span> Processing...');

			// Track action via AJAX
			$.post(arNoticeData.ajaxurl, {
				action: 'atlas_ar_track_notice_action',
				nonce: arNoticeData.nonce,
				notice_id: noticeId,
				action_name: actionName
			}, function(response) {
				if (response.success) {
					// Show success message
					$button.html('<span class="dashicons dashicons-yes" style="margin-top: 3px;"></span> Success!');

					// Handle redirect if provided
					if (response.data.redirect_url) {
						// Show instructions in alert
						var instructions = 'NEXT STEPS:\n\n' +
							'1. Fill out the contact form\n' +
							'2. Subject: "Request 80% Off Coupon - Early Access"\n' +
							'3. Your email: ' + response.data.email + '\n' +
							'4. We\'ll send you the coupon code within 24 hours!\n\n' +
							'Redirecting to contact page...';

						alert(instructions);

						// Redirect
						window.location.href = response.data.redirect_url;
					} else {
						// Reload page after 1 second
						setTimeout(function() {
							location.reload();
						}, 1000);
					}
				} else {
					// Show error
					alert(response.data.message || 'An error occurred. Please try again.');
					$button.prop('disabled', false).html(originalText);
				}
			}).fail(function() {
				// Handle AJAX failure
				alert('Connection error. Please try again.');
				$button.prop('disabled', false).html(originalText);
			});
		});

	});

	// CSS for rotation animation (inline)
	var style = document.createElement('style');
	style.innerHTML = '@keyframes rotation { from { transform: rotate(0deg); } to { transform: rotate(359deg); } }';
	document.head.appendChild(style);

})(jQuery);
