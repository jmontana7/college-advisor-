// ============================================================================
//  Obee — Step definitions (the "brain" of the intake flow)
// ----------------------------------------------------------------------------
//  Each step describes ONE screen of the Duolingo-style intake. The engine
//  (engine.js) reads this array and renders the right input type for each.
//
//  field types:
//    'options'      -> row of pill buttons (single select)
//    'slider'       -> one slider (GPA, units)
//    'dual-slider'  -> two sliders stacked (CC: cumulative + transferable GPA)
//    'card-stack'   -> repeatable mini-form cards (courses, AP/IB classes)
//    'dropdown'     -> state select only (HS) OR state + cascading college
//                       picker (CC) when cascadeCollege:true
//    'freeform-only'-> no quick options, just the chat field (extracurriculars, major)
//    'score-card'   -> small white card with 2 number inputs (SAT/ACT)
//
//  cardFields[].type:
//    'text'         -> free text input
//    'autocomplete' -> free text input + filtered suggestion list (still
//                       100% free-typeable -- suggestions are a convenience,
//                       never a restriction)
//    'select'       -> native <select> from a fixed options array
// ============================================================================

// Standard letter grades, high to low -- used for every course grade select.
const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

const HS_COURSE_TYPE_OPTIONS = ['Regular', 'Honors', 'AP', 'IB'];
const CC_COURSE_TYPE_OPTIONS = ['Transfer-level', 'Honors', 'AP credit', 'IB credit'];

// Curated course-name suggestions. This is a static list from general
// knowledge of common US course catalogs -- NOT a live database -- so
// students can always type their own course instead (the input never
// restricts free text, this only speeds up typing).
const HS_COURSE_SUGGESTIONS = [
  'English 9', 'English 10', 'English 11', 'English 12', 'AP English Language', 'AP English Literature',
  'Algebra I', 'Geometry', 'Algebra II', 'Pre-Calculus', 'AP Calculus AB', 'AP Calculus BC', 'AP Statistics',
  'Biology', 'Chemistry', 'Physics', 'AP Biology', 'AP Chemistry', 'AP Physics 1', 'AP Physics 2', 'AP Environmental Science',
  'World History', 'US History', 'AP US History', 'AP World History', 'Government', 'AP US Government', 'Economics', 'AP Economics', 'Psychology', 'AP Psychology',
  'Spanish I', 'Spanish II', 'Spanish III', 'AP Spanish Language', 'French I', 'French II', 'AP French Language',
  'AP Computer Science Principles', 'AP Computer Science A', 'Art', 'Band', 'Journalism', 'Yearbook', 'Health', 'PE',
];

const CC_COURSE_SUGGESTIONS = [
  'English Composition', 'Critical Thinking & Composition', 'Public Speaking',
  'College Algebra', 'Pre-Calculus', 'Calculus I', 'Calculus II', 'Statistics',
  'Biology', 'Chemistry', 'Physics', 'Anatomy & Physiology',
  'Microeconomics', 'Macroeconomics', 'US History', 'World History', 'Political Science',
  'Psychology', 'Sociology', 'Spanish', 'French',
  'Intro to Business', 'Financial Accounting', 'Managerial Accounting', 'Intro to Computer Science',
];

// Curated, NON-EXHAUSTIVE list of well-known community colleges per state.
// This is from general knowledge, not a verified live database -- "Enter
// manually" is always offered and should be used for anything not listed.
const COMMUNITY_COLLEGES_BY_STATE = {
  California: [
    'City College of San Francisco', 'De Anza College', 'Foothill College', 'Santa Monica College',
    'Diablo Valley College', 'Pasadena City College', 'Santa Barbara City College', 'San Diego City College',
    'Mt. San Antonio College', 'American River College', 'Sacramento City College', 'Orange Coast College',
    'Irvine Valley College', 'Cerritos College', 'El Camino College', 'Long Beach City College',
  ],
  Texas: [
    'Austin Community College', 'Houston Community College', 'Dallas College', 'San Jacinto College',
    'Lone Star College', 'Tarrant County College', 'Collin College', 'Alamo Colleges (San Antonio)',
  ],
  Florida: [
    'Miami Dade College', 'Broward College', 'Valencia College', 'Santa Fe College',
    'St. Petersburg College', 'Palm Beach State College', 'Hillsborough Community College',
  ],
  'New York': [
    'LaGuardia Community College', 'Borough of Manhattan Community College', 'Nassau Community College',
    'Suffolk County Community College', 'Hudson Valley Community College', 'Monroe Community College',
  ],
  Illinois: [
    'Harold Washington College', 'College of DuPage', 'Triton College', 'Oakton College', 'Elgin Community College',
  ],
  Washington: [
    'Bellevue College', 'Seattle Central College', 'North Seattle College', 'Highline College', 'Green River College',
  ],
  Arizona: [
    'Phoenix College', 'Mesa Community College', 'Pima Community College', 'Scottsdale Community College',
  ],
  Massachusetts: [
    'Bunker Hill Community College', 'Massachusetts Bay Community College', 'Middlesex Community College',
  ],
  'North Carolina': [
    'Wake Technical Community College', 'Central Piedmont Community College', 'Durham Technical Community College',
  ],
  Virginia: [
    'Northern Virginia Community College', 'J. Sargeant Reynolds Community College', 'Tidewater Community College',
  ],
};

const STEPS = {

  // --------------------------------------------------------------------
  // ENTRY POINT -- student type selector
  // --------------------------------------------------------------------
  student_type: {
    id: 'student_type',
    title: 'Let\u2019s start!',
    subtitle: 'First, who are you?',
    field: 'options',
    profileKey: 'student_type',
    options: [
      { value: 'high_school', label: 'I am a High school student' },
      { value: 'community_college', label: 'I am a Community College student' },
    ],
    branch: { high_school: 'hs_grade', community_college: 'cc_college_name' },
  },

  // --------------------------------------------------------------------
  // HIGH SCHOOL FLOW (10 steps)
  // --------------------------------------------------------------------
  hs_grade: {
    id: 'hs_grade', flow: 'hs', order: 1,
    title: 'Quick question:',
    subtitle: 'What grade are you in?',
    field: 'options',
    profileKey: 'grade',
    options: [
      { value: '9th', label: '9th' },
      { value: '10th', label: '10th' },
      { value: '11th', label: '11th' },
      { value: '12th', label: 'I\u2019m a senior!' },
    ],
    next: 'hs_gpa',
  },

  hs_gpa: {
    id: 'hs_gpa', flow: 'hs', order: 2,
    title: 'I know it\u2019s personal but..',
    subtitle: 'In order to do this right, I need your GPA',
    field: 'slider',
    profileKey: 'gpa',
    slider: { min: 1.0, max: 4.0, step: 0.1, default: 3.5 },
    next: 'hs_courses',
  },

  hs_courses: {
    id: 'hs_courses', flow: 'hs', order: 3,
    title: 'Let\u2019s talk about academics...',
    subtitle: 'What courses have you taken, and their grades',
    field: 'card-stack',
    profileKey: 'courses',
    cardFields: [
      { key: 'name', label: 'Class Name', placeholder: 'e.g U.S History', type: 'autocomplete', suggestions: HS_COURSE_SUGGESTIONS },
      { key: 'grade', label: 'Grade', placeholder: 'Select grade', type: 'select', options: GRADE_OPTIONS },
      { key: 'type', label: 'Course Type', placeholder: 'Select type', type: 'select', options: HS_COURSE_TYPE_OPTIONS },
    ],
    next: 'hs_extracurriculars',
  },

  hs_extracurriculars: {
    id: 'hs_extracurriculars', flow: 'hs', order: 4,
    title: 'When you\u2019re not in class....',
    subtitle: 'What extracurriculars are you part of?',
    helperText: 'I understand that extracurricular activities can range from sports to taking care of elderly family members at home. For this reason, in this section you can enter them directly in the chat.',
    field: 'freeform-only',
    profileKey: 'extracurriculars',
    freeformPlaceholder: 'Tell me about your extracurricular activities. If you have one, include your role and how long you\u2019ve been involved. If not, that\u2019s completely fine, feel free to share how you contribute to your community in your own way.',
    next: 'hs_major',
  },

  hs_major: {
    id: 'hs_major', flow: 'hs', order: 5,
    title: 'What do you see yourself studying in college?',
    subtitle: 'It\u2019s okay if you are still undecided.',
    field: 'freeform-only',
    profileKey: 'major',
    freeformPlaceholder: 'What area of knowledge interests you the most?',
    next: 'hs_college_type',
  },

  hs_college_type: {
    id: 'hs_college_type', flow: 'hs', order: 6,
    title: 'What is your college type preference?',
    subtitle: 'Remember that everything is valid and each path is different...',
    field: 'options',
    profileKey: 'college_type_preference',
    options: [
      { value: 'open', label: 'I\u2019m open to anything' },
      { value: 'community_college', label: 'Community College' },
      { value: 'four_year_only', label: 'Only 4-Year Universities' },
      { value: 'not_sure', label: 'Not sure... Yet.' },
    ],
    next: 'hs_state',
  },

  hs_state: {
    id: 'hs_state', flow: 'hs', order: 7,
    title: 'Where do you call home?',
    subtitle: 'Your state of residency affects crucial factors such as in-state tuition, grant eligibility and more...',
    field: 'dropdown',
    stateOnly: true,
    profileKey: 'state',
    next: 'hs_out_of_state',
  },

  hs_out_of_state: {
    id: 'hs_out_of_state', flow: 'hs', order: 8,
    title: 'Are you open to out-of-state schools?',
    subtitle: 'It helps me narrow down your options based on the state(s) you\u2019re considering.',
    field: 'options',
    profileKey: 'out_of_state_preference',
    options: [
      { value: 'in_state_only', label: 'I want to stay in my state' },
      { value: 'explore', label: 'I want to explore the country' },
    ],
    skippable: true,
    next: 'hs_first_gen',
  },

  hs_first_gen: {
    id: 'hs_first_gen', flow: 'hs', order: 9,
    title: 'Unlock first-gen specific resources and programs in your further recommendations',
    subtitle: 'Are you a first-gen student?',
    field: 'options',
    profileKey: 'first_gen',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
    skippable: true,
    next: 'hs_test_scores',
  },

  hs_test_scores: {
    id: 'hs_test_scores', flow: 'hs', order: 10,
    title: 'While many schools are test-optional,',
    subtitle: 'Feel free to include your SAT or ACT scores.',
    field: 'score-card',
    profileKey: 'test_scores',
    scoreFields: [
      { key: 'sat', label: 'SAT', placeholder: '400-1600' },
      { key: 'act', label: 'ACT', placeholder: '1-36' },
    ],
    skippable: true,
    next: 'thinking',
  },

  // --------------------------------------------------------------------
  // COMMUNITY COLLEGE FLOW (13 steps)
  // --------------------------------------------------------------------
  cc_college_name: {
    id: 'cc_college_name', flow: 'cc', order: 1,
    title: 'Which community college do you attend?',
    subtitle: 'This helps me determine which articulation agreement applies to you.',
    field: 'dropdown',
    cascadeCollege: true,
    profileKey: 'community_college',
    next: 'cc_gpa',
  },

  cc_gpa: {
    id: 'cc_gpa', flow: 'cc', order: 2,
    title: 'I\u2019d love to make my recommendations as accurate as possible.',
    subtitle: 'Your college GPA is one of the best ways to do that',
    field: 'dual-slider',
    profileKey: 'gpa',
    sliders: [
      { key: 'cumulative', label: 'What\u2019s your cumulative college GPA?', min: 1.0, max: 4.0, step: 0.1, default: 3.5 },
      { key: 'transferable', label: 'What\u2019s your transferable GPA? (optional)', min: 1.0, max: 4.0, step: 0.1, default: 3.5 },
    ],
    next: 'cc_units',
  },

  cc_units: {
    id: 'cc_units', flow: 'cc', order: 3,
    title: 'Units completed:',
    subtitle: 'Most four-year schools require 60 semester units (or 90 quarter units) to transfer. How close are you?',
    field: 'slider',
    profileKey: 'units_completed',
    slider: { min: 0, max: 120, step: 1, default: 60 },
    freeformPlaceholder: 'Share any special circumstances regarding your units here.',
    next: 'cc_major',
  },

  cc_major: {
    id: 'cc_major', flow: 'cc', order: 4,
    title: 'What\u2019s your intended major?',
    subtitle: 'Not sure yet? That\u2019s okay! Just choose the field you\u2019re leaning toward.',
    helperText: 'I know your academic interests aren\u2019t something that can always be captured with a single button. Feel free to share your intended major in the chat, along with any details or goals you think are relevant.',
    field: 'freeform-only',
    profileKey: 'major',
    freeformPlaceholder: 'Share your academic plans here.',
    next: 'cc_courses',
  },

  cc_courses: {
    id: 'cc_courses', flow: 'cc', order: 5,
    title: 'Let\u2019s talk about academics...',
    subtitle: 'What courses have you taken, and their grades',
    field: 'card-stack',
    profileKey: 'courses',
    cardFields: [
      { key: 'name', label: 'Class Name', placeholder: 'e.g U.S History', type: 'autocomplete', suggestions: CC_COURSE_SUGGESTIONS },
      { key: 'grade', label: 'Grade', placeholder: 'Select grade', type: 'select', options: GRADE_OPTIONS },
      { key: 'college', label: 'College', placeholder: 'Current or previous college', type: 'text' },
    ],
    next: 'cc_ap_ib',
  },

  cc_ap_ib: {
    id: 'cc_ap_ib', flow: 'cc', order: 6,
    title: 'Any AP or IB classes?',
    subtitle: 'List them here with your grades.',
    field: 'card-stack',
    profileKey: 'ap_ib_courses',
    cardFields: [
      { key: 'name', label: 'Class Name', placeholder: 'e.g U.S History', type: 'autocomplete', suggestions: HS_COURSE_SUGGESTIONS },
      { key: 'grade', label: 'Grade', placeholder: 'Select grade', type: 'select', options: GRADE_OPTIONS },
      { key: 'type', label: 'Course Type', placeholder: 'Select type', type: 'select', options: CC_COURSE_TYPE_OPTIONS },
    ],
    skippable: true,
    next: 'cc_igetc',
  },

  cc_igetc: {
    id: 'cc_igetc', flow: 'cc', order: 7,
    title: 'For California students:',
    subtitle: 'Are you planning to complete IGETC before transferring?',
    field: 'options',
    profileKey: 'igetc_status',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'what_is_igetc', label: 'What is IGETC?', isInfo: true },
    ],
    skippable: true,
    next: 'cc_extracurriculars',
  },

  cc_extracurriculars: {
    id: 'cc_extracurriculars', flow: 'cc', order: 8,
    title: 'When you\u2019re not in class....',
    subtitle: 'What extracurriculars are you part of?',
    helperText: 'I understand that extracurricular activities can range from sports to taking care of elderly family members at home. For this reason, in this section you can enter them directly in the chat.',
    field: 'freeform-only',
    profileKey: 'extracurriculars',
    freeformPlaceholder: 'Tell me about your extracurricular activities. If you have one, include your role and how long you\u2019ve been involved. If not, that\u2019s completely fine, feel free to share how you contribute to your community in your own way.',
    next: 'cc_transfer_timeline',
  },

  cc_transfer_timeline: {
    id: 'cc_transfer_timeline', flow: 'cc', order: 9,
    title: 'When do you plan to transfer?',
    subtitle: 'Remember that everything is valid and each path is different...',
    field: 'options',
    profileKey: 'transfer_timeline',
    options: [
      { value: 'next_fall', label: 'Next Fall' },
      { value: 'in_1_year', label: 'In 1 year' },
      { value: 'not_sure', label: 'Not sure... Yet.' },
    ],
    next: 'cc_specific_schools',
  },

  cc_specific_schools: {
    id: 'cc_specific_schools', flow: 'cc', order: 10,
    title: 'Do you have any specific schools in mind?',
    subtitle: 'Or would you like me to recommend some from scratch?',
    field: 'options',
    profileKey: 'has_specific_schools',
    options: [
      { value: 'has_list', label: 'I have my schools' },
      { value: 'build_list', label: 'Build my school list' },
    ],
    skippable: true,
    next: 'cc_out_of_state',
  },

  cc_out_of_state: {
    id: 'cc_out_of_state', flow: 'cc', order: 11,
    title: 'Are you open to out-of-state schools?',
    subtitle: 'It helps me narrow down your options based on the state(s) you\u2019re considering.',
    field: 'options',
    profileKey: 'out_of_state_preference',
    options: [
      { value: 'in_state_only', label: 'I want to stay in my state' },
      { value: 'explore', label: 'I want to explore the country' },
    ],
    skippable: true,
    next: 'cc_first_gen',
  },

  cc_first_gen: {
    id: 'cc_first_gen', flow: 'cc', order: 12,
    title: 'Unlock first-gen specific resources and programs in your further recommendations',
    subtitle: 'Are you a first-gen student?',
    field: 'options',
    profileKey: 'first_gen',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
    skippable: true,
    next: 'cc_test_scores',
  },

  cc_test_scores: {
    id: 'cc_test_scores', flow: 'cc', order: 13,
    title: 'While many schools are test-optional,',
    subtitle: 'Feel free to include your SAT or ACT scores.',
    field: 'score-card',
    profileKey: 'test_scores',
    scoreFields: [
      { key: 'sat', label: 'SAT', placeholder: '400-1600' },
      { key: 'act', label: 'ACT', placeholder: '1-36' },
    ],
    skippable: true,
    next: 'thinking',
  },
};

const FLOW_ORDER = {
  hs: ['hs_grade', 'hs_gpa', 'hs_courses', 'hs_extracurriculars', 'hs_major', 'hs_college_type', 'hs_state', 'hs_out_of_state', 'hs_first_gen', 'hs_test_scores'],
  cc: ['cc_college_name', 'cc_gpa', 'cc_units', 'cc_major', 'cc_courses', 'cc_ap_ib', 'cc_igetc', 'cc_extracurriculars', 'cc_transfer_timeline', 'cc_specific_schools', 'cc_out_of_state', 'cc_first_gen', 'cc_test_scores'],
};

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];
