/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoWrap}>
          <Img src="https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png" alt="Mundus Trade" width="200" style={logo} />
        </Section>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <Button style={button} href={confirmationUrl}>Verify email</Button>
        </Section>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={signoff}>The Mundus Trade Team</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f5f3ee', fontFamily: '-apple-system, Segoe UI, Roboto, Arial, sans-serif', padding: '40px 16px' }
const container = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px 40px', maxWidth: '560px', margin: '0 auto' }
const logoWrap = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { display: 'inline-block', maxWidth: '200px', height: 'auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0d0d0d',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#3a3a3a',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#8a1538',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#777', margin: '0 0 16px' }
const signoff = { fontSize: '13px', color: '#999', margin: '24px 0 0', borderTop: '1px solid #eee', paddingTop: '24px' }
