'use client';

import { Toaster } from 'sileo';
import 'sileo/styles.css';

export default function SileoProvider() {
  return <Toaster position="top-right" />;
}
