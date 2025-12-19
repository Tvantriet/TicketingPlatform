import amqp from 'amqplib';
export declare function initSender(): Promise<void>;
export declare function sendMessage(message: any, routingKey: string): Promise<void>;
export declare function getConnection(): amqp.ChannelModel | null;
export declare function getChannel(): amqp.Channel | null;
export declare function closeSender(): Promise<void>;
//# sourceMappingURL=sender.d.ts.map