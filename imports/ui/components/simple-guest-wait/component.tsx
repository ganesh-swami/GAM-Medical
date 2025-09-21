import React, { useState, useRef, useEffect } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from '../join-handler/guest-wait/styles';
import SimpleAVPreview from '../simple-av-preview/component';

const messages = defineMessages({
  windowTitle: {
    id: 'app.guest.wait',
    description: 'Title while user is waiting for approval',
    defaultMessage: 'Waiting for moderator approval',
  },
  guestWait: {
    id: 'app.guest.waiting',
    description: 'Message while user is waiting for approval',
    defaultMessage: 'Please wait for a moderator to accept your request to join the meeting.',
  },
  calculating: {
    id: 'app.guest.calculating',
    description: 'Message while calculating waiting position',
    defaultMessage: 'Calculating your position in the waiting queue...',
  },
});

const SimpleGuestWait = () => {
  const intl = useIntl();
  const [message, setMessage] = useState(intl.formatMessage(messages.guestWait));
  const [positionMessage, setPositionMessage] = useState(intl.formatMessage(messages.calculating));
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  const handlePreviewReady = (stream: MediaStream) => {
    console.log('AV Preview ready', stream);
    setIsPreviewReady(true);
  };

  return (
    <Styled.Container>
      <Styled.Content id="content">
        {/* Simple AV Preview Component */}
        <SimpleAVPreview onReady={handlePreviewReady} />
        
        <Styled.Heading id="heading">
          {intl.formatMessage(messages.windowTitle)}
        </Styled.Heading>
        
        {/* Loading Animation */}
        <Styled.Spinner>
          <Styled.Bounce1 />
          <Styled.Bounce2 />
          <Styled.Bounce />
        </Styled.Spinner>
        
        {/* Status Messages */}
        <p>{message}</p>
        {positionMessage && <p>{positionMessage}</p>}
      </Styled.Content>
    </Styled.Container>
  );
};

export default SimpleGuestWait;
