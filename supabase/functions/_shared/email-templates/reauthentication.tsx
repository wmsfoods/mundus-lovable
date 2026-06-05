/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoWrap}>
          <Img src="https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png" alt="Mundus Trade" width="200" style={logo} />
        </Section>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
        <Text style={signoff}>The Mundus Trade Team</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f5f3ee', fontFamily: '-apple-system, Segoe UI, Roboto, Arial, sans-serif', padding: '40px 16px' }
const container = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px 40px', maxWidth: '560px', margin: '0 auto' }
const logoWrap = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { display: 'inline-block', maxWidth: '200px', height: 'auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#8a1538', letterSpacing: '4px', textAlign: 'center' as const, margin: '0 0 30px' }
const footer = { fontSize: '13px', color: '#777', margin: '0 0 16px' }
const signoff = { fontSize: '13px', color: '#999', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '24px' }
