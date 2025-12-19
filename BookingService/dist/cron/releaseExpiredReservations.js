// Cron job to mark expired bookings and release their tickets
// Runs every minute
import * as bookingService from '../services/bookingService.js';
import { sendMessage } from '../messaging/sender.js';
import { ROUTING_KEYS } from '../messaging/messagingConfig.js';
export async function expireOldBookings() {
    try {
        // Get expired bookings before marking them
        const expiredBookings = await bookingService.getPendingExpiredBookings();
        if (expiredBookings.length > 0) {
            // Mark them as expired
            await bookingService.expireOldBookings();
            // Release their tickets
            for (const booking of expiredBookings) {
                try {
                    await sendMessage({
                        ticketId: booking.ticketId,
                        reason: 'booking_expired',
                        timestamp: new Date().toISOString(),
                    }, ROUTING_KEYS.TICKET_RELEASE);
                }
                catch (error) {
                    console.error(`Failed to release ticket ${booking.ticketId}:`, error);
                }
            }
            console.log(`Expired ${expiredBookings.length} bookings and released their tickets`);
        }
    }
    catch (error) {
        console.error('Error in expireOldBookings cron:', error);
    }
}
// Run every minute
export function startCron() {
    const INTERVAL = 60 * 1000; // 1 minute
    setInterval(expireOldBookings, INTERVAL);
    console.log('Cron job started: Expire old bookings every 1 minute');
}
//# sourceMappingURL=releaseExpiredReservations.js.map