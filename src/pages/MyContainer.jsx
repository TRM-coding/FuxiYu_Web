import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag } from 'antd';
import { Radio } from 'antd';
const { Column, ColumnGroup } = Table;

const Desc = props => (
  <Flex justify="center" align="center" style={{ height: '100%' }}>
    <Typography.Title type="secondary" level={5} style={{ whiteSpace: 'nowrap' }}>
      {props.text}
    </Typography.Title>
  </Flex>
);


const data = [
  {
    key: '1',
    container_name: 'web',
    container_image: 'nginx:1.25',
    machine_id: '1',
    container_status: 'online',
    port: '5017',
    // accounts as list of [username, role]
    accounts: [['alice', 'ADMIN']],
  },
  {
    key: '2',
    container_name: 'db',
    container_image: 'mysql:8.0',
    machine_id: '2',
    container_status: 'maintenance',
    port: '5011',
    accounts: [['test', 'ADMIN'], ['alice', 'COLLABORATOR']],
  },
  {
    key: '3',
    container_name: 'api',
    container_image: 'python:3.11',
    machine_id: '4',
    container_status: 'online',
    port: '5012',
    accounts: [['alice', 'ADMIN'], ['bob', 'COLLABORATOR']],
  },
];

const Home = () => {
  const [value3, setValue3] = useState('Any');
  const [position, setPosition] = useState('end');
  // temporary current user for UI behavior
  const currentUser = 'alice';

  // helpers
  const getRoleForUser = (accounts, username) => {
    if (!accounts) return null;
    if (Array.isArray(accounts)) {
      for (const item of accounts) {
        if (Array.isArray(item)) {
          if (item[0] === username) return item[1];
        } else if (item && typeof item === 'object') {
          if ((item.name ?? item.username) === username) return item.type ?? item.role ?? null;
        }
      }
    } else if (accounts && typeof accounts === 'object') {
      if ((accounts.name ?? accounts.username) === username) return accounts.type ?? accounts.role ?? null;
    }
    return null;
  };

  const handleInvite = record => {
    console.log('invite on', record);
  };
  const handleDeleteContainer = record => {
    console.log('delete container', record);
  };
  const handleLeave = record => {
    console.log('leave container', record);
  };
  const handleRemoveUser = (record, username) => {
    console.log('remove user', username, 'from', record);
  };
  const handleChangeRole = (record, username) => {
    console.log('change role for', username, 'in', record);
  };

  const onChange3 = ({ target: { value } }) => {
    console.log('radio3 checked', value);
    setValue3(value);
  };

  return (<>Abandoned</>);
};

export default Home;