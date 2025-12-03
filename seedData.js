// backend/seed.js
import mongoose from 'mongoose';
import User from './models/User.js';
import Job from './models/Job.js';
import Company from './models/Company.js';
import Application from './models/Application.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-hire-platform';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    await User.deleteMany({});
    await Job.deleteMany({});
    await Company.deleteMany({});
    await Application.deleteMany({});
    
    console.log('🗑️  Cleared existing data');
    
    // Create test companies
    const companies = [
      {
        name: 'TechCorp Inc',
        description: 'Leading technology solutions provider',
        website: 'https://techcorp.com',
        industry: 'Technology',
        size: '501-1000',
        stats: {
          totalJobs: 5,
          activeJobs: 3,
          totalCandidates: 50,
          totalHires: 15,
          avgTimeToHire: 30
        }
      },
      {
        name: 'FinServ Ltd',
        description: 'Financial services innovator',
        website: 'https://finserv.com',
        industry: 'Finance',
        size: '201-500',
        stats: {
          totalJobs: 3,
          activeJobs: 2,
          totalCandidates: 30,
          totalHires: 8,
          avgTimeToHire: 45
        }
      }
    ];
    
    const createdCompanies = await Company.insertMany(companies);
    console.log('🏢 Created companies:', createdCompanies.length);
    
    // Create test jobs
    const jobs = [
      {
        title: 'Senior React Developer',
        description: 'We are looking for an experienced React developer...',
        company: createdCompanies[0]._id,
        companyName: 'TechCorp Inc',
        location: 'Remote',
        type: 'full-time',
        experience: { min: 3, max: 8 },
        salary: { min: 80000, max: 120000, currency: 'USD' },
        requiredSkills: [
          { name: 'React', level: 'advanced', isRequired: true },
          { name: 'JavaScript', level: 'advanced', isRequired: true },
          { name: 'Node.js', level: 'intermediate', isRequired: true }
        ],
        status: 'active',
        visibility: 'public'
      },
      {
        title: 'Full Stack Developer',
        description: 'Looking for a full stack developer...',
        company: createdCompanies[0]._id,
        companyName: 'TechCorp Inc',
        location: 'New York, NY',
        type: 'full-time',
        experience: { min: 2, max: 5 },
        salary: { min: 70000, max: 100000, currency: 'USD' },
        requiredSkills: [
          { name: 'React', level: 'intermediate', isRequired: true },
          { name: 'Node.js', level: 'intermediate', isRequired: true },
          { name: 'MongoDB', level: 'intermediate', isRequired: true }
        ],
        status: 'active',
        visibility: 'public'
      }
    ];
    
    const createdJobs = await Job.insertMany(jobs);
    console.log('💼 Created jobs:', createdJobs.length);
    
    // Create test users (candidates)
    const candidateUsers = [
      {
        fullName: 'John Doe',
        email: 'john@example.com',
        mobile: '+1234567890',
        password: 'password123',
        role: 'candidate',
        profile: {
          location: 'San Francisco, CA',
          skills: [
            { name: 'React', proficiency: 8, yearsOfExperience: 3 },
            { name: 'JavaScript', proficiency: 9, yearsOfExperience: 5 },
            { name: 'Node.js', proficiency: 7, yearsOfExperience: 2 }
          ],
          experience: [
            {
              company: 'Previous Corp',
              position: 'Frontend Developer',
              startDate: new Date('2020-01-01'),
              endDate: new Date('2023-12-31'),
              current: false,
              description: 'Developed React applications'
            }
          ],
          education: [
            {
              degree: 'Bachelor of Computer Science',
              institution: 'Stanford University',
              year: 2019
            }
          ]
        }
      },
      {
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        mobile: '+0987654321',
        password: 'password123',
        role: 'candidate',
        profile: {
          location: 'New York, NY',
          skills: [
            { name: 'Python', proficiency: 9, yearsOfExperience: 4 },
            { name: 'Django', proficiency: 8, yearsOfExperience: 3 },
            { name: 'React', proficiency: 6, yearsOfExperience: 1 }
          ]
        }
      }
    ];
    
    const createdCandidates = await User.insertMany(candidateUsers);
    console.log('👤 Created candidates:', createdCandidates.length);
    
    // Create test HR user
    const hrUser = new User({
      fullName: 'HR Manager',
      email: 'hr@techcorp.com',
      mobile: '+1112223333',
      password: 'password123',
      role: 'hr',
      companyName: 'TechCorp Inc',
      isVerified: true
    });
    
    await hrUser.save();
    console.log('👔 Created HR user');
    
    // Create some applications
    const applications = [
      {
        candidateId: createdCandidates[0]._id,
        jobId: createdJobs[0]._id,
        status: 'applied',
        matchScore: 85
      },
      {
        candidateId: createdCandidates[1]._id,
        jobId: createdJobs[0]._id,
        status: 'shortlisted',
        matchScore: 72
      }
    ];
    
    const createdApplications = await Application.insertMany(applications);
    console.log('📝 Created applications:', createdApplications.length);
    
    console.log('✅ Database seeded successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();