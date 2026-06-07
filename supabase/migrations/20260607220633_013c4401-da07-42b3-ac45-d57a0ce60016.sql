ALTER TABLE public.negotiation_messages
  DROP CONSTRAINT IF EXISTS negotiation_messages_message_type_check;

ALTER TABLE public.negotiation_messages
  ADD CONSTRAINT negotiation_messages_message_type_check
  CHECK (message_type = ANY (ARRAY['text'::text, 'proposal'::text, 'system'::text, 'item_update'::text, 'via_mundus'::text]));

COMMENT ON COLUMN public.negotiation_messages.message_type IS
'text=chat livre · proposal=contraproposta · system=evento automático · item_update=mudança de item · via_mundus=mensagem formal Mundus-delivered (email composer)';