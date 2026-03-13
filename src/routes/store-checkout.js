/**
 * HeadyStore Checkout Route — /api/store/checkout
 * Creates Stripe Checkout sessions for Heady™Store purchases
 * Uses test keys in sandbox mode, live keys in production
 */

const { CONFIG } = require('../config/global');

async function storeCheckoutHandler(req, res) {
    try {
        const {
            product_name,
            price,           // in cents
            vendor,
            vendor_url,
            image_url,
            success_url,
            cancel_url,
        } = req.body;

        if (!product_name || !price) {
            return res.status(400).json({ error: 'product_name and price are required' });
        }

        // Use test key for Heady™Store, fall back to live key
        const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        const stripe = require('stripe')(stripeKey, {
            apiVersion: '2024-06-20',
            appInfo: { name: 'HeadyStore', version: '1.0.0', url: 'https://headystore.com' },
        });

        // Create a one-time payment checkout session
        const sessionParams = {
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product_name,
                        description: `via ${vendor || 'HeadyStore'}`,
                        ...(image_url ? { images: [image_url] } : {}),
                        metadata: {
                            vendor,
                            vendor_url: vendor_url || '',
                            source: 'headystore',
                        },
                    },
                    unit_amount: Math.max(price, 50), // Stripe minimum is $0.50
                },
                quantity: 1,
            }],
            success_url: success_url || 'https://headystore.com?checkout=success',
            cancel_url: cancel_url || 'https://headystore.com?checkout=cancel',
            metadata: {
                vendor,
                vendor_url: vendor_url || '',
                storefront: 'headystore',
            },
        };

        const session = await stripe.checkout.sessions.create(sessionParams);

        return res.json({
            sessionId: session.id,
            url: session.url,
        });

    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: 'Checkout failed', message: err.message });
    }
}

module.exports = { storeCheckoutHandler };
