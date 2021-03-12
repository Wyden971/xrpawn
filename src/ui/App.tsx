import React, {useEffect, useState} from 'react';
import {Button} from "@material-ui/core";
import * as electron from 'electron'

export const App: React.FC<any> = () => {

  const [test, setTest] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      setTest(test + 1);
      electron.ipcRenderer.send('perform-action', test + 1);
     /// ipcRenderer.invoke('perform-action', test + 1);
    }, 1000);
  }, [test]);
  return (
    <div><Button color="primary">Hello World {test}</Button></div>
  )
}
