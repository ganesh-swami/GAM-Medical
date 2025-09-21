import styled, { keyframes } from 'styled-components';
import {
  borderSize,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  colorGrayLabel,
  colorWhite,
  colorGrayLighter,
  colorPrimary,
} from '/imports/ui/stylesheets/styled-components/palette';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
`;

const Content = styled.div`
  text-align: center;
  color: white;
  font-weight: bold;
  font-size: 24px;
`;

const Heading = styled.h1`
  font-size: 2rem;
`;

const Position = styled.div`
  align-items: center;
  text-align: center;
  font-size: 1.2rem;
  font-weight: normal;
`;

const sk_bouncedelay = keyframes`
  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1.0);
  }
`;

const Spinner = styled.div`
  margin: 20px auto;
  font-size: 0px;
`;

const Bounce = styled.div`
  width: 18px;
  height: 18px;
  margin: 0 5px;
  background-color: rgb(255, 255, 255);
  display: inline-block;
  border-radius: 100%;
  animation: ${sk_bouncedelay} calc(1.4s) infinite ease-in-out both;
`;

const Bounce1 = styled(Bounce)`
  animation-delay: -0.32s;
`;

const Bounce2 = styled(Bounce)`
  animation-delay: -0.16s;
`;

const Box = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ContentBox = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const DeviceSelect = styled.select`
  background-color: ${colorWhite};
    border: 0.1rem solid ${colorGrayLighter};
    border-radius: 8px;
    color: ${colorGrayLabel};
    width: 100%;
    height: 2rem;
    padding: 1px;
  
    &:focus {
      outline: none;
      border-radius: ${borderSize};
      box-shadow: 0 0 0 ${borderSize} ${colorPrimary}, inset 0 0 0 1px ${colorPrimary};
    }
  
    &:hover,
    &:focus {
      outline: transparent;
      outline-style: dotted;
      outline-width: ${borderSize};
    }
`;

export default {
  Container,
  Content,
  Heading,
  Position,
  Bounce,
  Bounce1,
  Bounce2,
  Spinner,
  Box,
  ContentBox,
  DeviceSelect,
};
