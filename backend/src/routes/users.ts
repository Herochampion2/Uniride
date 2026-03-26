import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'); 
const personalEmailDomains = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com']);

const hasUniversityEmail = (email: string) => {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  const domain = parts[1].toLowerCase();
  return !personalEmailDomains.has(domain);
};

router.get('/', (req, res) => {
  res.json(db.data.users);
});

router.get('/verification/pending', async (req, res) => {
  await db.read();
  const pendingUsers = db.data.users.filter((user) => user.verificationStatus === 'pending');
  res.json(pendingUsers);
});

router.get('/:id', (req, res) => {
  const user = db.data.users.find((u) => u.id === req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).send('User not found');
  }
});

router.post('/signup', async (req, res) => {
    const { name, email, password, phone, university } = req.body;
    
    // Check if user already exists
    const existingUser = db.data.users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const newUser: User = {
        id: uuidv4(),
        name,
        email,
        password,
        phone,
        university,
        schedule: [],
        verificationStatus: 'unverified'
    };

    db.data.users.push(newUser);
    await db.write();

    res.status(201).json(newUser);
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.data.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json(user);
    } else {
        res.status(401).json({ error: 'Invalid email or password' });
    }
});

router.post('/:id/verification/submit', async (req, res) => {
    await db.read();
    const user = db.data.users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      studentIdNumber,
      licenseNumber,
      vehicleRegNumber,
    } = req.body as {
      studentIdNumber?: string;
      licenseNumber?: string;
      vehicleRegNumber?: string;
    };

    if (!studentIdNumber || !licenseNumber || !vehicleRegNumber) {
      return res.status(400).json({ error: 'studentIdNumber, licenseNumber and vehicleRegNumber are required' });
    }

    user.verificationStatus = 'pending';
    user.verification = {
      studentIdNumber,
      licenseNumber,
      vehicleRegNumber,
      universityEmailVerified: hasUniversityEmail(user.email),
      submittedAt: new Date().toISOString(),
      reviewedAt: undefined,
      reviewerNote: undefined,
    };

    await db.write();
    res.json({ message: 'Verification submitted', user });
});

router.patch('/:id/verification/review', async (req, res) => {
    await db.read();
    const user = db.data.users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      status,
      reviewerNote,
    } = req.body as {
      status?: 'verified' | 'rejected';
      reviewerNote?: string;
    };

    if (!status || (status !== 'verified' && status !== 'rejected')) {
      return res.status(400).json({ error: 'status must be verified or rejected' });
    }

    user.verificationStatus = status;
    user.verification = {
      ...(user.verification || {}),
      reviewedAt: new Date().toISOString(),
      reviewerNote: reviewerNote || '',
    };

    await db.write();
    res.json({ message: 'Verification reviewed', user });
});

router.post('/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ error: 'Invalid Google token' });
        }

        const { sub: googleId, email, name, picture } = payload;

        let user: User | undefined = db.data.users.find(u => u.email === email);
        if (!user) {
            // Create a new user if it doesn't exist
            const newUser: User = {
                id: uuidv4(),
                name: name || '',
                email: email || '',
                phone: '',
                university: '',
                schedule: [],
                googleId: googleId,
                verificationStatus: 'unverified'
            };
            db.data.users.push(newUser);
            await db.write();
            user = newUser;
        }

        res.json(user);
    } catch (error) {
        console.error('Error verifying Google token:', error);
        res.status(401).json({ error: 'Google login failed' });
    }
});

export default router;
