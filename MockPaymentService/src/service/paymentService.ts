import { sendMessage } from "../messaging/sender";
import { ROUTING_KEYS } from "../messaging/messagingConfig";
import { randomInt } from "crypto";

export function handlePaymentRequest(paymentRequest: any) {
    console.log('Received payment request:', paymentRequest);
    // send payment complete message after .5 second to simulate processing time
    const success = randomInt(1, 10) > 1;
    setTimeout(() => {
        if (success) {
        sendMessage({
                paymentId: paymentRequest.paymentId,
                status: 'completed',
            }, ROUTING_KEYS.PAYMENT_COMPLETED);
        } else {
            sendMessage({
                paymentId: paymentRequest.paymentId,
                status: 'failed',
            }, ROUTING_KEYS.PAYMENT_FAILED);
        }
    }, 500);
}