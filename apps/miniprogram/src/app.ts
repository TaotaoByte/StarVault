import { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';

function App({ children }: PropsWithChildren<any>) {
  return children;
}

export default App;
