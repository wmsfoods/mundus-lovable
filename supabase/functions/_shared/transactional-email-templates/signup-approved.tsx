import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface SignupApprovedProps {
  userName?: string
  loginUrl?: string
}

const WINE = '#8B2252'
const LOGO_URL = 'https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png'
const DEFAULT_LOGIN_URL = 'https://app.mundustrade.us/login'

const SignupApprovedEmail = ({ userName, loginUrl = DEFAULT_LOGIN_URL }: SignupApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Mundus Trade account has been approved.</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="Mundus Trade" width="220" style={logo} />
          <Text style={tagline}>INTERNATIONAL MEAT TRADING</Text>
        </Section>

        <Section style={content}>
          <Heading style={heading}>Account Approved!</Heading>
          <Text style={paragraph}>Congratulations, <strong>{userName || 'there'}</strong>! 🎉</Text>
          <Text style={paragraph}>Your account has been approved and you now have full access to the Mundus Trade platform.</Text>
          <Text style={paragraph}>You can start exploring offers, managing your products, and connecting with buyers/suppliers worldwide.</Text>

          <Section style={buttonWrap}>
            <Button href={loginUrl} style={button}>Access Platform</Button>
            <Text style={fallbackLabel}>If the button doesn't open, copy and paste this address into your browser:</Text>
            <Text style={fallbackUrl}>{loginUrl}</Text>
          </Section>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>If you have any questions, contact us at <a href="mailto:contact@mundustrade.com" style={footerLink}>contact@mundustrade.com</a></Text>
          <Text style={finePrint}>Mundus Trade · International Meat Trading Platform</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignupApprovedEmail,
  subject: '✅ Your Mundus Trade Account Has Been Approved!',
  displayName: 'Signup approved',
  previewData: {
    userName: 'Fernando Buyer Apple',
    loginUrl: DEFAULT_LOGIN_URL,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
}

const card = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: '1px solid #f0e6ea',
  borderRadius: '8px',
  overflow: 'hidden',
}

const header = {
  padding: '28px 24px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #f0e6ea',
}

const logo = {
  display: 'inline-block',
  maxWidth: '220px',
  height: 'auto',
}

const tagline = {
  color: '#999999',
  fontSize: '11px',
  letterSpacing: '2px',
  margin: '10px 0 0',
}

const content = {
  padding: '32px 28px',
  color: '#333333',
}

const heading = {
  color: WINE,
  fontSize: '24px',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#333333',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0 0',
}

const button = {
  backgroundColor: WINE,
  color: '#ffffff',
  textDecoration: 'none',
  padding: '14px 32px',
  borderRadius: '8px',
  fontWeight: 'bold',
  display: 'inline-block',
}

const fallbackLabel = {
  color: '#777777',
  fontSize: '12px',
  margin: '14px 0 0',
}

const fallbackUrl = {
  color: WINE,
  fontSize: '13px',
  margin: '6px 0 0',
  wordBreak: 'break-all' as const,
}

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #eeeeee',
}

const footerText = {
  color: '#777777',
  fontSize: '12px',
  margin: '4px 0',
}

const footerLink = {
  color: WINE,
}

const finePrint = {
  color: '#999999',
  fontSize: '11px',
  margin: '8px 0 0',
}