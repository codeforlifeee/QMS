import React, { useState } from 'react';
import { MessageCircle, Mail, Send, Copy, Check, Share2, Phone } from 'lucide-react';
import { Card, Button, Input } from '../ui/index.jsx';
import toast from 'react-hot-toast';

/**
 * WhatsApp & Email Integration
 * Features:
 * - Quick WhatsApp share with pre-formatted message
 * - Email quotation with template
 * - Copy to clipboard
 * - Custom message templates
 * - Follow-up reminders
 */
const ShareQuotation = ({ quotation, pdfUrl }) => {
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [customMessage, setCustomMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(quotation?.email || '');
  const [recipientPhone, setRecipientPhone] = useState(quotation?.phone || '');
  const [copied, setCopied] = useState(false);

  const MESSAGE_TEMPLATES = {
    professional: {
      name: 'Professional',
      whatsapp: `Dear ${quotation?.guestName || 'Valued Customer'},

Thank you for your interest in our travel packages! 🌍

*Package Details:*
📍 Destination: {destination}
📅 Duration: {duration}
👥 Travelers: {pax}
💰 Total Cost: ₹{price}

✨ *Highlights:*
{activities}

📋 Your customized quotation is ready for review.

For booking or queries, contact us:
📞 +91-XXXXXXXXXX
📧 info@travelcompany.com

*Book within 7 days for 5% early bird discount!* 🎉

Best regards,
Travel Company Team`,
      email: `Dear ${quotation?.guestName || 'Valued Customer'},

Thank you for choosing us for your travel needs.

Please find attached your customized travel quotation for:
• Destination: {destination}
• Duration: {duration}  
• Travelers: {pax}
• Total Package Cost: ₹{price}

Our package includes:
{activities}

We look forward to making your dream vacation a reality!

For any questions or to proceed with booking, please contact us.

Best regards,
Your Travel Team`,
    },
    friendly: {
      name: 'Friendly',
      whatsapp: `Hi ${quotation?.guestName || 'there'}! 👋

Your awesome {destination} vacation package is ready! ✈️🎉

*Quick Summary:*
🗓 {duration} of pure fun
👨‍👩‍👧‍👦 For {pax}
💵 Just ₹{price}

*Cool stuff included:*
{activities}

Ready to make memories? Let's chat! 💬

WhatsApp: +91-XXXXXXXXXX
📧 Email: travel@company.com

*Pro tip:* Book in the next 48 hours for a surprise gift! 🎁`,
      email: `Hello ${quotation?.guestName || 'there'}!

Your {destination} adventure awaits! 🌟

We've put together an amazing package just for you:
• {duration} of unforgettable experiences
• Perfect for {pax}
• All this for only ₹{price}!

Check out the attached quotation for full details.

Questions? Just hit reply - we're here to help!

Cheers,
The Travel Squad 🌍`,
    },
    luxury: {
      name: 'Luxury',
      whatsapp: `Greetings ${quotation?.guestName || 'Distinguished Guest'},

We are delighted to present your bespoke {destination} experience. 🌟

*Your Exclusive Package:*
📍 Destination: {destination}
🗓 Duration: {duration}
👥 Guests: {pax}
💎 Investment: ₹{price}

*Curated Experiences:*
{activities}

*Exclusive Benefits:*
✓ Personal travel consultant
✓ 24/7 concierge service  
✓ VIP experiences
✓ Luxury accommodations

Contact our luxury travel desk:
☎️ +91-XXXXXXXXXX
✉️ luxury@travelcompany.com

*Limited availability - Reserve your dates today.*

With warm regards,
Luxury Travel Concierge`,
      email: `Dear ${quotation?.guestName || 'Esteemed Guest'},

It is our pleasure to present your exclusive {destination} travel experience.

Your Bespoke Journey:
• Destination: {destination}
• Duration: {duration}
• Travelers: {pax}
• Total Investment: ₹{price}

As our valued guest, you will enjoy:
{activities}

Plus complimentary luxury amenities and personalized service throughout.

Please review the attached quotation at your convenience.

Warmest regards,
Your Luxury Travel Curator`,
    },
  };

  const [selectedTemplate, setSelectedTemplate] = useState('professional');

  const formatMessage = (template) => {
    const destination = quotation?.selectedActivities?.[0]?.location || 'Your Destination';
    const duration = `${quotation?.tripDuration?.nights || 0}N/${quotation?.tripDuration?.days || 0}D`;
    const pax = `${quotation?.totalAdults || 0} Adults${quotation?.totalChildren ? ` + ${quotation.totalChildren} Children` : ''}`;
    const price = Math.round(quotation?.costs?.finalTotal || 0).toLocaleString();
    const activities = quotation?.selectedActivities
      ?.slice(0, 5)
      .map(a => `• ${a.tour}`)
      .join('\n') || '• Amazing experiences included';

    return template
      .replace(/{destination}/g, destination)
      .replace(/{duration}/g, duration)
      .replace(/{pax}/g, pax)
      .replace(/{price}/g, price)
      .replace(/{activities}/g, activities);
  };

  const getCurrentMessage = () => {
    const template = MESSAGE_TEMPLATES[selectedTemplate][activeTab];
    return customMessage || formatMessage(template);
  };

  const shareViaWhatsApp = () => {
    const message = getCurrentMessage();
    const phone = recipientPhone.replace(/\D/g, ''); // Remove non-digits
    const encodedMessage = encodeURIComponent(message);
    
    let url;
    if (phone && phone.length >= 10) {
      // With specific number
      url = `https://wa.me/${phone}?text=${encodedMessage}`;
    } else {
      // Without number (opens WhatsApp with message ready)
      url = `https://wa.me/?text=${encodedMessage}`;
    }
    
    window.open(url, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const shareViaEmail = () => {
    const subject = `Travel Quotation - ${quotation?.selectedActivities?.[0]?.location || 'Package'} - ${quotation?.guestName || ''}`;
    const body = getCurrentMessage();
    
    const mailto = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success('Opening email client...');
  };

  const copyToClipboard = () => {
    const message = getCurrentMessage();
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const shareSMS = () => {
    const message = getCurrentMessage();
    const phone = recipientPhone.replace(/\D/g, '');
    
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    toast.success('Opening SMS app...');
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Share2 className="text-blue-600" />
          Share Quotation
        </h3>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'whatsapp'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'email'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail size={18} />
            Email
          </button>
        </div>

        {/* Template Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Template
          </label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedTemplate(key);
                  setCustomMessage('');
                }}
                className={`p-3 border-2 rounded-lg text-left transition-all ${
                  selectedTemplate === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {key === 'professional' && '🎯 Business-like tone'}
                  {key === 'friendly' && '😊 Casual & warm'}
                  {key === 'luxury' && '💎 Premium & exclusive'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recipient Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {activeTab === 'whatsapp' && (
            <Input
              label="WhatsApp Number (with country code)"
              placeholder="+91-9876543210"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              icon={<Phone size={16} />}
            />
          )}
          {activeTab === 'email' && (
            <Input
              label="Recipient Email"
              type="email"
              placeholder="customer@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              icon={<Mail size={16} />}
            />
          )}
        </div>

        {/* Message Preview */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Preview
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={15}
            value={getCurrentMessage()}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Customize your message..."
          />
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>{getCurrentMessage().length} characters</span>
            <button
              onClick={() => setCustomMessage('')}
              className="text-blue-600 hover:text-blue-700"
            >
              Reset to template
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {activeTab === 'whatsapp' ? (
            <>
              <Button
                onClick={shareViaWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle size={16} className="mr-2" />
                Share via WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={shareSMS}
              >
                <Phone size={16} className="mr-1" />
                SMS
              </Button>
            </>
          ) : (
            <Button
              onClick={shareViaEmail}
              className="flex-1"
            >
              <Mail size={16} className="mr-2" />
              Send Email
            </Button>
          )}
          <Button
            variant="outline"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check size={16} className="mr-1 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} className="mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <h4 className="font-semibold text-gray-900 mb-3">🚀 Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              const text = `Hi! Check out this amazing ${quotation?.selectedActivities?.[0]?.location || 'travel'} package: ${window.location.href}`;
              const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
              window.open(url, '_blank');
            }}
            className="bg-white p-3 rounded-lg border border-green-200 hover:border-green-400 hover:shadow-md transition-all text-left"
          >
            <MessageCircle className="text-green-600 mb-2" size={20} />
            <div className="font-medium text-gray-900 text-sm">Share Link</div>
            <div className="text-xs text-gray-600">Send quotation URL</div>
          </button>

          <button
            onClick={() => {
              navigator.share({
                title: `Travel Quotation - ${quotation?.guestName || ''}`,
                text: getCurrentMessage(),
                url: window.location.href,
              }).catch(() => toast.error('Sharing not supported'));
            }}
            className="bg-white p-3 rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all text-left"
          >
            <Share2 className="text-blue-600 mb-2" size={20} />
            <div className="font-medium text-gray-900 text-sm">Native Share</div>
            <div className="text-xs text-gray-600">Use device share menu</div>
          </button>
        </div>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tips</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Personalize the message for better engagement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Include a clear call-to-action and deadline</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Follow up within 24-48 hours if no response</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Use WhatsApp Business for professional image</span>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default ShareQuotation;
