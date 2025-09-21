import styled from 'styled-components';
import ReactModal from 'react-modal';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';

// export const Background = styled.div`
//   position: fixed;
//   inset: 0;
//   background: rgba(0, 0, 0, 0.4);
//   z-index: 1000;
// `;


export const Background = styled.span`
  ${({ isBlurred }) => isBlurred
    && css`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(10px);
    z-index: 998;
    `}
`;

export const Modal = styled(ReactModal)`
  position: absolute;
  top: 10%;
  left: 15%;
  right: 15%;
  bottom: 10%;
  background: var(--color-background, #fff);
  border-radius: 8px;
  outline: none;
  display: flex;
  flex-direction: column;
`;


export const AudioVideoModal = styled(ModalSimple)`
  padding: 1rem;
  min-height: 20rem;
`;

export const Header = styled.div`
  padding: 16px 20px 8px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  font-size: 18px;
  font-weight: 600;
`;

export const Content = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  flex: 1;
  overflow: auto;
`;

export const VideoCol = styled.div`
  flex: 1;
`;

export const MicCol = styled.div`
  width: 320px;
`;

export const VideoWrapper = styled.div`
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  height: 260px;
`;

export const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const Badge = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 2px 6px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
`;

export const MicCard = styled.div`
  padding: 12px;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 8px;
`;

export const Footer = styled.div`
  padding: 12px 20px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid rgba(0,0,0,0.06);
`;
