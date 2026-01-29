/**
 * Slack Notifier Module (Socket Mode)
 * Handles Slack notifications and interactive approval flow
 */

const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');

class SlackNotifier {
    constructor(config) {
        this.config = config;
        this.botToken = process.env.SLACK_BOT_TOKEN;
        this.appToken = process.env.SLACK_APP_TOKEN;
        this.channelId = process.env.SLACK_CHANNEL_ID;

        if (!this.botToken || !this.appToken || !this.channelId) {
            console.warn('⚠️ Slack configuration missing in .env (Bot Token, App Token, or Channel ID)');
        }

        // Initialize Clients
        this.webClient = new WebClient(this.botToken);
        this.socketClient = new SocketModeClient({ appToken: this.appToken });

        this.pendingRequests = new Map(); // Store pending approval promises
    }

    /**
     * Start the Socket Mode Client
     */
    async start() {
        if (!this.appToken) return;

        // Determine listeners are already attached? 
        // SocketModeClient throws if we attach listeners multiple times? No.

        // Handle all events for debugging
        this.socketClient.on('slack_event', async ({ body, ack }) => {
            console.log(`📡 Slack event received: ${body.type}`);
        });

        // Handle Interactive Events (Button clicks, Modals)
        this.socketClient.on('interactive', async ({ body, ack }) => {
            console.log('🔘 Interactive event received');
            await this.handleInteraction(body, ack);
        });

        // Handle Messages (Commands like "開始")
        this.socketClient.on('message', async ({ event, ack }) => {
            console.log('✉️ Message event received');
            await ack();
            await this.handleMessage(event);
        });

        await this.socketClient.start();
        console.log('⚡ Slack Socket Mode connected!');
    }

    /**
     * Stop the client
     */
    async stop() {
        if (this.socketClient) {
            await this.socketClient.disconnect();
            console.log('🔌 Slack Socket Mode disconnected');
        }
    }

    /**
     * Wait for a start trigger from Slack
     */
    async waitForStartTrigger() {
        if (!this.botToken || !this.appToken) {
            console.log('⚠️ Slack integration disabled. Starting immediately...');
            return true;
        }

        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "🚀 *AC-Illust Auto-Uploader 準備完了*\nバッチ処理を開始するには、このチャンネルで「*開始*」と入力するか、下のボタンを押してください。"
                }
            },
            {
                type: "actions",
                block_id: "start_actions",
                elements: [
                    {
                        type: "button",
                        text: { "type": "plain_text", "text": "🚀 バッチを開始", "emoji": true },
                        style: "primary",
                        value: "start",
                        action_id: "action_start_batch"
                    }
                ]
            }
        ];

        await this.webClient.chat.postMessage({
            channel: this.channelId,
            blocks: blocks,
            text: "AC-Illust Auto-Uploader 準備完了"
        });

        return new Promise((resolve) => {
            this.startBatchResolver = resolve;
            console.log('⏳ Slackからの開始指示を待機中...');
        });
    }

    /**
     * Send completion summary
     */
    async sendCompletionSummary(uploadedCount, targetCount) {
        if (!this.botToken) return;

        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🏁 バッチ処理完了",
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*投稿結果:* ${uploadedCount} / ${targetCount} 枚 のアップロードに成功しました。\nお疲れ様でした！`
                }
            }
        ];

        await this.webClient.chat.postMessage({
            channel: this.channelId,
            blocks: blocks,
            text: `バッチ処理完了: ${uploadedCount}/${targetCount}`
        });
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(event) {
        console.log(`💬 Slack message received in ${event.channel}: "${event.text}"`);

        // Only care about messages in the configured channel
        if (event.channel !== this.channelId) {
            console.log(`   (Ignored: channel mismatch, expected ${this.channelId})`);
            return;
        }
        if (event.bot_id) return; // Ignore bots

        const text = event.text;
        if (text && (text.includes('開始') || text.toLowerCase().includes('start'))) {
            if (this.startBatchResolver) {
                console.log('🚀 Slackから開始指示を受け取りました');
                const resolver = this.startBatchResolver;
                this.startBatchResolver = null;

                await this.webClient.chat.postMessage({
                    channel: this.channelId,
                    thread_ts: event.ts,
                    text: "🆗 了解しました。バッチ処理を開始します！"
                });

                resolver(true);
            }
        }
    }

    /**
     * Send approval request with image and buttons
     */
    async sendApprovalRequest(imagePath, metadata, generatorName) {
        if (!this.botToken || !this.appToken) {
            return { action: 'approved', reason: 'Slack disabled' };
        }

        console.log('📨 Sending approval request to Slack...');

        try {
            // 1. Upload image
            // v2 is recommended
            const path = require('path');
            const uploadResult = await this.webClient.files.uploadV2({
                channel_id: this.channelId,
                file: imagePath,
                filename: path.basename(imagePath),
                title: metadata.title,
                initial_comment: `🎨 **New Image Generated** (${generatorName})\nwaiting for approval...`,
            });

            // 2. Send interactive blocks
            const blocks = [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Title:* ${metadata.title}\n*Tags:* ${metadata.tags.join(', ')}\n*Desc:* ${metadata.description || '(none)'}`
                    }
                },
                {
                    type: "actions",
                    block_id: "approval_actions",
                    elements: [
                        {
                            type: "button",
                            text: { "type": "plain_text", "text": "✅ Approve", "emoji": true },
                            style: "primary",
                            value: "approve",
                            action_id: "action_approve"
                        },
                        {
                            type: "button",
                            text: { "type": "plain_text", "text": "❌ Reject (Regen)", "emoji": true },
                            style: "danger",
                            value: "reject",
                            action_id: "action_reject"
                        },
                        {
                            type: "button",
                            text: { "type": "plain_text", "text": "🕒 Postpone (1h)", "emoji": true },
                            value: "postpone",
                            action_id: "action_postpone"
                        },
                        {
                            type: "button",
                            text: { "type": "plain_text", "text": "✏️ Edit", "emoji": true },
                            value: "edit",
                            action_id: "action_edit"
                        }
                    ]
                }
            ];

            const messageResult = await this.webClient.chat.postMessage({
                channel: this.channelId,
                blocks: blocks,
                text: "New image approval required"
            });

            const messageTs = messageResult.ts;

            // 3. Create a promise that resolves when user clicks a button
            return new Promise((resolve) => {
                this.pendingRequests.set(messageTs, {
                    resolve,
                    metadata: metadata,
                    startTime: Date.now()
                });
                console.log(`⏳ Waiting for approval on message ${messageTs}...`);
            });

        } catch (error) {
            console.error('❌ Slack notification failed:', error.message);
            return { action: 'skipped', reason: 'Internal Error' };
        }
    }

    /**
     * Handle incoming interaction payload
     */
    async handleInteraction(payload, ack) {
        try {
            // Acknowledge immediately
            await ack();

            if (payload.type === 'block_actions') {
                const action = payload.actions[0];
                const actionId = action.action_id;
                const messageTs = payload.message.ts;

                // Handle Start Batch button (Special case: not in pendingRequests)
                if (actionId === 'action_start_batch') {
                    if (this.startBatchResolver) {
                        const resolver = this.startBatchResolver;
                        this.startBatchResolver = null;
                        await this.webClient.chat.postMessage({
                            channel: payload.channel.id,
                            text: `🚀 *開始指示を受け取りました* (by <@${payload.user.id}>). バッチ処理を開始します！`
                        });
                        resolver(true);
                    } else {
                        await this.webClient.chat.postEphemeral({
                            channel: payload.channel.id,
                            user: payload.user.id,
                            text: "⚠️ バッチは既に開始されているか、待機状態ではありません。"
                        });
                    }
                    return;
                }

                const request = this.pendingRequests.get(messageTs);
                if (!request) {
                    try {
                        await this.webClient.chat.postEphemeral({
                            channel: payload.channel.id,
                            user: payload.user.id,
                            text: "⚠️ This request has already been processed or expired."
                        });
                    } catch (e) { }
                    return;
                }

                // Handle regular buttons
                if (actionId === 'action_edit') {
                    await this.openEditModal(payload.trigger_id, request.metadata, messageTs);
                    return; // Wait for modal
                }

                let result = { action: '', user: payload.user.username || payload.user.id };
                let replyText = "";
                let updateBlocks = payload.message.blocks.filter(b => b.type !== 'actions');

                if (actionId === 'action_approve') {
                    result.action = 'approve';
                    replyText = `✅ *承認済み* (by <@${payload.user.id}>). アップロードを開始します...`;
                } else if (actionId === 'action_reject') {
                    result.action = 'reject';
                    replyText = `❌ *却下* (by <@${payload.user.id}>). 画像を再生成します...`;
                } else if (actionId === 'action_postpone') {
                    result.action = 'postpone';
                    replyText = `🕒 *保留* (by <@${payload.user.id}>). 後ほどリトライします。`;
                } else if (actionId === 'action_start_batch') {
                    if (this.startBatchResolver) {
                        const resolver = this.startBatchResolver;
                        this.startBatchResolver = null;
                        await this.webClient.chat.postMessage({
                            channel: payload.channel.id,
                            text: `🚀 *開始指示を受け取りました* (by <@${payload.user.id}>). バッチ処理を開始します！`
                        });
                        resolver(true);
                    }
                    return;
                }

                // Update Slack message
                updateBlocks.push({
                    type: "section",
                    text: { type: "mrkdwn", text: replyText }
                });

                await this.webClient.chat.update({
                    channel: payload.channel.id,
                    ts: messageTs,
                    blocks: updateBlocks,
                    text: `Request processed: ${result.action}`
                });

                // Resolve promise
                this.pendingRequests.delete(messageTs);
                request.resolve(result);

            } else if (payload.type === 'view_submission') {
                // Modal submission
                const view = payload.view;
                const messageTs = view.private_metadata;
                const request = this.pendingRequests.get(messageTs);

                if (!request) return;

                // Extract values
                const title = view.state.values.title_block.title_input.value;
                const tagsStr = view.state.values.tags_block.tags_input.value;
                const desc = view.state.values.desc_block.desc_input.value;

                // Parse tags
                const tags = tagsStr.split(/[,、\s]+/).filter(t => t.trim().length > 0);

                // Update metadata
                request.metadata.title = title;
                request.metadata.tags = tags;
                request.metadata.description = desc;

                const result = {
                    action: 'approve',
                    metadata: request.metadata,
                    user: payload.user.username || payload.user.id
                };

                // Confirm edit via thread
                try {
                    await this.webClient.chat.postMessage({
                        channel: this.channelId,
                        thread_ts: messageTs,
                        text: `✏️✅ *Edited & Approved* by <@${payload.user.id}>\nNew Title: ${title}`
                    });
                } catch (e) {
                    console.warn('Error sending edit confirmation:', e.message);
                }

                // Resolve promise
                this.pendingRequests.delete(messageTs);
                request.resolve(result);
            }

        } catch (error) {
            console.error('❌ Error handling interaction:', error);
        }
    }

    /**
     * Open Modal for editing metadata
     */
    async openEditModal(triggerId, metadata, messageTs) {
        try {
            await this.webClient.views.open({
                trigger_id: triggerId,
                view: {
                    type: "modal",
                    callback_id: "edit_metadata_modal",
                    private_metadata: messageTs, // Pass message ts to track back
                    title: {
                        type: "plain_text",
                        text: "Edit Metadata"
                    },
                    submit: {
                        type: "plain_text",
                        text: "Save & Approve"
                    },
                    close: {
                        type: "plain_text",
                        text: "Cancel"
                    },
                    blocks: [
                        {
                            type: "input",
                            block_id: "title_block",
                            element: {
                                type: "plain_text_input",
                                action_id: "title_input",
                                initial_value: metadata.title
                            },
                            label: {
                                type: "plain_text",
                                text: "Title"
                            }
                        },
                        {
                            type: "input",
                            block_id: "tags_block",
                            element: {
                                type: "plain_text_input",
                                action_id: "tags_input",
                                initial_value: metadata.tags.join(', '),
                                multiline: true
                            },
                            label: {
                                type: "plain_text",
                                text: "Tags (comma or space separated)"
                            }
                        },
                        {
                            type: "input",
                            block_id: "desc_block",
                            element: {
                                type: "plain_text_input",
                                action_id: "desc_input",
                                initial_value: metadata.description || "",
                                multiline: true
                            },
                            label: {
                                type: "plain_text",
                                text: "Description"
                            },
                            optional: true
                        }
                    ]
                }
            });
        } catch (error) {
            console.error('Error opening modal:', error);
        }
    }
}

module.exports = SlackNotifier;
