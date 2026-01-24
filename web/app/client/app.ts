import './design/styles.css';

import { Router } from '@app/router';

import './home/views/home-view';
import './home/views/not-found-view';
import './config/views/config-list-view';
import './config/views/config-edit-view';
import './execution/views/execute-view';

const router = new Router('app-content');
router.start();
