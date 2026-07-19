// ============================================================================
//  Obee -- Step definitions (the "brain" of the intake flow)
// ============================================================================

const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
const HS_COURSE_TYPE_OPTIONS = ['Regular', 'Honors', 'AP', 'IB'];
const CC_COURSE_TYPE_OPTIONS = ['Transfer-level', 'Honors', 'AP credit', 'IB credit'];
// 0.5 to 10.5 in half-unit steps, covering every decimal in between.
const COURSE_UNITS_OPTIONS = Array.from({ length: 21 }, (_, i) => String(0.5 + i * 0.5));

// Same category keys used to tag HS_COURSE_SUGGESTIONS below -- picking a
// subject here filters the Class Name autocomplete down to real courses
// from that subject instead of the full list.
const HS_SUBJECT_OPTIONS = [
  { value: 'humanities', label: 'English / Humanities' },
  { value: 'math', label: 'Math' },
  { value: 'science', label: 'Science' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'cs', label: 'Computer Science' },
  { value: 'social', label: 'Social Studies' },
  { value: 'business', label: 'Business' },
  { value: 'arts', label: 'Arts' },
  { value: 'language', label: 'World Language' },
  { value: 'health', label: 'Health / PE' },
  { value: 'other', label: 'Other / Electives' },
];

// --------------------------------------------------------------------------
// Course suggestions, tagged by broad subject category so they can be
// re-ordered based on the student's previously-stated intended major.
// Still a static curated list from general knowledge -- students can always
// type their own course, this only speeds up typing and highlights relevant
// options first.
// --------------------------------------------------------------------------
const HS_COURSE_SUGGESTIONS = [
  { name: 'English 9', cat: 'humanities' }, { name: 'English 10', cat: 'humanities' },
  { name: 'English 11', cat: 'humanities' }, { name: 'English 12', cat: 'humanities' },
  { name: 'AP English Language', cat: 'humanities' }, { name: 'AP English Literature', cat: 'humanities' },
  { name: 'Creative Writing', cat: 'humanities' }, { name: 'Journalism', cat: 'humanities' }, { name: 'Speech & Debate', cat: 'humanities' },
  { name: 'Algebra I', cat: 'math' }, { name: 'Geometry', cat: 'math' }, { name: 'Algebra II', cat: 'math' },
  { name: 'Trigonometry', cat: 'math' }, { name: 'Pre-Calculus', cat: 'math' }, { name: 'AP Calculus AB', cat: 'math' },
  { name: 'AP Calculus BC', cat: 'math' }, { name: 'AP Statistics', cat: 'math' }, { name: 'Discrete Math', cat: 'math' },
  { name: 'Biology', cat: 'science' }, { name: 'Chemistry', cat: 'science' }, { name: 'Physics', cat: 'science' },
  { name: 'AP Biology', cat: 'science' }, { name: 'AP Chemistry', cat: 'science' }, { name: 'AP Physics 1', cat: 'science' },
  { name: 'AP Physics 2', cat: 'science' }, { name: 'AP Physics C: Mechanics', cat: 'engineering' },
  { name: 'AP Environmental Science', cat: 'science' }, { name: 'Anatomy & Physiology', cat: 'health' },
  { name: 'Astronomy', cat: 'science' }, { name: 'Earth Science', cat: 'science' },
  { name: 'Engineering Design', cat: 'engineering' }, { name: 'Intro to Engineering', cat: 'engineering' },
  { name: 'Robotics', cat: 'engineering' }, { name: 'CAD / Drafting', cat: 'engineering' },
  { name: 'AP Computer Science Principles', cat: 'cs' }, { name: 'AP Computer Science A', cat: 'cs' },
  { name: 'Intro to Programming', cat: 'cs' }, { name: 'Web Design', cat: 'cs' }, { name: 'Game Design', cat: 'cs' },
  { name: 'World History', cat: 'social' }, { name: 'US History', cat: 'social' }, { name: 'AP US History', cat: 'social' },
  { name: 'AP World History', cat: 'social' }, { name: 'AP European History', cat: 'social' },
  { name: 'Government', cat: 'social' }, { name: 'AP US Government', cat: 'social' },
  { name: 'Economics', cat: 'business' }, { name: 'AP Microeconomics', cat: 'business' }, { name: 'AP Macroeconomics', cat: 'business' },
  { name: 'Psychology', cat: 'social' }, { name: 'AP Psychology', cat: 'social' }, { name: 'Sociology', cat: 'social' }, { name: 'Geography', cat: 'social' },
  { name: 'Studio Art', cat: 'arts' }, { name: 'AP Studio Art', cat: 'arts' }, { name: 'Drawing & Painting', cat: 'arts' },
  { name: 'Ceramics', cat: 'arts' }, { name: 'Photography', cat: 'arts' }, { name: 'Graphic Design', cat: 'arts' },
  { name: 'Band', cat: 'arts' }, { name: 'Orchestra', cat: 'arts' }, { name: 'Choir', cat: 'arts' },
  { name: 'Theater / Drama', cat: 'arts' }, { name: 'Dance', cat: 'arts' }, { name: 'Film Studies', cat: 'arts' },
  { name: 'Spanish I', cat: 'language' }, { name: 'Spanish II', cat: 'language' }, { name: 'Spanish III', cat: 'language' },
  { name: 'AP Spanish Language', cat: 'language' }, { name: 'French I', cat: 'language' }, { name: 'French II', cat: 'language' },
  { name: 'AP French Language', cat: 'language' }, { name: 'Mandarin I', cat: 'language' }, { name: 'German I', cat: 'language' }, { name: 'Latin I', cat: 'language' },
  { name: 'Intro to Business', cat: 'business' }, { name: 'Marketing', cat: 'business' },
  { name: 'Personal Finance', cat: 'business' }, { name: 'Entrepreneurship', cat: 'business' }, { name: 'Accounting', cat: 'business' },
  { name: 'Health', cat: 'health' }, { name: 'PE', cat: 'health' }, { name: 'Sports Medicine', cat: 'health' }, { name: 'Nutrition', cat: 'health' },
  { name: 'Yearbook', cat: 'other' }, { name: 'Leadership', cat: 'other' }, { name: 'Career Exploration', cat: 'other' },
];

const CC_COURSE_SUGGESTIONS = [
  { name: 'English Composition', cat: 'humanities' }, { name: 'Critical Thinking & Composition', cat: 'humanities' },
  { name: 'Public Speaking', cat: 'humanities' }, { name: 'Creative Writing', cat: 'humanities' }, { name: 'World Literature', cat: 'humanities' },
  { name: 'College Algebra', cat: 'math' }, { name: 'Pre-Calculus', cat: 'math' }, { name: 'Calculus I', cat: 'math' },
  { name: 'Calculus II', cat: 'math' }, { name: 'Calculus III', cat: 'math' }, { name: 'Linear Algebra', cat: 'math' },
  { name: 'Differential Equations', cat: 'math' }, { name: 'Statistics', cat: 'math' }, { name: 'Discrete Mathematics', cat: 'math' },
  { name: 'Biology', cat: 'science' }, { name: 'Chemistry', cat: 'science' }, { name: 'Organic Chemistry', cat: 'science' },
  { name: 'Physics for Scientists & Engineers', cat: 'science' }, { name: 'Anatomy & Physiology', cat: 'health' },
  { name: 'Microbiology', cat: 'science' }, { name: 'Environmental Science', cat: 'science' },
  { name: 'Statics', cat: 'engineering' }, { name: 'Circuits', cat: 'engineering' }, { name: 'Engineering Graphics', cat: 'engineering' },
  { name: 'Intro to Computer Science (CS1)', cat: 'cs' }, { name: 'Data Structures (CS2)', cat: 'cs' },
  { name: 'Discrete Structures', cat: 'cs' }, { name: 'Web Development', cat: 'cs' },
  { name: 'US History', cat: 'social' }, { name: 'World History', cat: 'social' }, { name: 'Political Science', cat: 'social' },
  { name: 'Psychology', cat: 'social' }, { name: 'Sociology', cat: 'social' }, { name: 'Anthropology', cat: 'social' },
  { name: 'Microeconomics', cat: 'business' }, { name: 'Macroeconomics', cat: 'business' },
  { name: 'Intro to Business', cat: 'business' }, { name: 'Financial Accounting', cat: 'business' },
  { name: 'Managerial Accounting', cat: 'business' }, { name: 'Marketing Principles', cat: 'business' }, { name: 'Business Law', cat: 'business' },
  { name: 'Studio Art', cat: 'arts' }, { name: 'Art History', cat: 'arts' }, { name: 'Music Theory', cat: 'arts' },
  { name: 'Theater Arts', cat: 'arts' }, { name: 'Photography', cat: 'arts' }, { name: 'Graphic Design', cat: 'arts' },
  { name: 'Spanish', cat: 'language' }, { name: 'French', cat: 'language' }, { name: 'American Sign Language', cat: 'language' },
  { name: 'Nursing Fundamentals', cat: 'health' }, { name: 'Nutrition', cat: 'health' }, { name: 'Kinesiology', cat: 'health' },
];

// Matched against whatever the student typed for their intended major/career
// (a free-text field, so this covers both major names like "biology" and
// career phrasings like "I want to be a doctor") to bubble the most relevant
// courses to the top of the Class Name autocomplete. Deliberately broad --
// better to loosely match a career phrasing than to miss it entirely.
const MAJOR_KEYWORD_MAP = {
  arts: ['art', 'design', 'music', 'theater', 'theatre', 'film', 'dance', 'graphic', 'photograph', 'fine art', 'animator', 'animation', 'illustrator'],
  engineering: ['engineer', 'mechanical', 'civil eng', 'electrical eng', 'aerospace', 'robotics', 'architect'],
  cs: ['computer science', 'software', 'programming', 'computer engineering', 'data science', 'information technology', 'coding', 'cybersecurity', 'developer', 'programmer', 'web dev', 'app dev', 'machine learning', 'artificial intelligence'],
  math: ['math', 'statistics', 'actuarial', 'statistician'],
  science: [
    'biology', 'chemistry', 'physics', 'pre-med', 'premed', 'biochem', 'environmental science', 'genetics',
    'doctor', 'physician', 'medicine', 'medical school', 'med school', 'surgeon', 'surgery',
    'dentist', 'dental', 'pharmacist', 'pharmacy', 'veterinarian', 'vet school', 'radiologist', 'anesthesiologist',
    'chiropractor', 'optometrist', 'physicist', 'chemist', 'biologist',
  ],
  health: ['nursing', 'nurse', 'health', 'kinesiology', 'public health', 'nutrition', 'nutritionist', 'dietitian', 'physical therapy', 'physical therapist', 'occupational therapy', 'paramedic', 'ems'],
  business: ['business', 'economics', 'finance', 'marketing', 'accounting', 'accountant', 'entrepreneur', 'management', 'banker', 'consultant', 'real estate', 'human resources'],
  humanities: ['history', 'philosophy', 'english', 'literature', 'writing', 'journalism', 'writer', 'author', 'journalist', 'teacher', 'teaching', 'education'],
  social: ['psychology', 'psychologist', 'sociology', 'political', 'anthropology', 'social work', 'social worker', 'communication', 'counselor', 'therapist', 'law', 'lawyer', 'attorney', 'legal'],
  language: ['spanish', 'french', 'linguistics', 'language', 'translation', 'translator', 'interpreter'],
};

function guessCategoryFromMajorText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  let bestCat = null;
  let bestScore = 0;
  Object.entries(MAJOR_KEYWORD_MAP).forEach(([cat, keywords]) => {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  });
  return bestCat;
}

// --------------------------------------------------------------------------
// Curated, NON-EXHAUSTIVE community college list for all 50 states. From
// general knowledge, not a live verified database -- "Enter manually" is
// always offered. Some states genuinely have fewer community colleges
// (e.g. ND, SD, WY), so shorter lists there are accurate, not incomplete
// curation.
// --------------------------------------------------------------------------
const COMMUNITY_COLLEGES_BY_STATE = {
  Alabama: ['Jefferson State Community College', 'Shelton State Community College', 'Central Alabama Community College', 'Bishop State Community College'],
  Alaska: ['Kenai Peninsula College', 'Kodiak College', 'Prince William Sound College'],
  Arizona: ['Phoenix College', 'Mesa Community College', 'Pima Community College', 'Scottsdale Community College', 'Glendale Community College', 'Chandler-Gilbert Community College'],
  Arkansas: ['Pulaski Technical College', 'NorthWest Arkansas Community College', 'Arkansas State University-Beebe'],
  California: [
    'Allan Hancock College', 'American River College', 'Antelope Valley College', 'Bakersfield College',
    'Barstow Community College', 'Berkeley City College', 'Butte College', 'Cabrillo College',
    'Calbright College', 'Canada College', 'Cerritos College', 'Cerro Coso Community College',
    'Chabot College', 'Chaffey College', 'College of Alameda', 'College of Marin',
    'College of San Mateo', 'College of the Canyons', 'College of the Desert', 'College of the Redwoods',
    'College of the Sequoias', 'College of the Siskiyous', 'Columbia College', 'Compton College',
    'Contra Costa College', 'Copper Mountain College', 'Cosumnes River College', 'Crafton Hills College',
    'Cuyamaca College', 'Cypress College', 'De Anza College', 'Diablo Valley College',
    'East Los Angeles College', 'El Camino College', 'Evergreen Valley College', 'Feather River College',
    'Folsom Lake College', 'Foothill College', 'Fresno City College', 'Fullerton College',
    'Gavilan College', 'Glendale Community College', 'Golden West College', 'Grossmont College',
    'Hartnell College', 'Imperial Valley College', 'Irvine Valley College', 'Lake Tahoe Community College',
    'Laney College', 'Las Positas College', 'Lassen Community College', 'Long Beach City College',
    'Los Angeles City College', 'Los Angeles Mission College', 'Los Angeles Pierce College', 'Los Angeles Southwest College',
    'Los Angeles Trade-Technical College', 'Los Angeles Valley College', 'Los Medanos College', 'Mendocino College',
    'Merced College', 'Merritt College', 'MiraCosta College', 'Mission College',
    'Modesto Junior College', 'Monterey Peninsula College', 'Moorpark College', 'Moreno Valley College',
    'Mt. San Antonio College', 'Mt. San Jacinto College', 'Napa Valley College', 'Norco College',
    'Ohlone College', 'Orange Coast College', 'Oxnard College', 'Palo Verde College',
    'Palomar College', 'Pasadena City College', 'Porterville College', 'Reedley College',
    'Rio Hondo College', 'Riverside City College', 'Sacramento City College', 'Saddleback College',
    'San Bernardino Valley College', 'San Diego City College', 'San Diego College of Continuing Education', 'San Diego Mesa College',
    'San Diego Miramar College', 'San Joaquin Delta College', 'San Jose City College', 'Santa Ana College',
    'Santa Barbara City College', 'Santa Monica College', 'Santa Rosa Junior College', 'Santiago Canyon College',
    'Shasta College', 'Sierra College', 'Skyline College', 'Solano Community College',
    'Southwestern College', 'Taft College', 'Ventura College', 'Victor Valley College',
    'West Hills College Coalinga', 'West Hills College Lemoore', 'West Los Angeles College', 'West Valley College',
    'Woodland Community College', 'Yuba College',
  ],
  Colorado: ['Community College of Denver', 'Front Range Community College', 'Pikes Peak Community College', 'Red Rocks Community College'],
  Connecticut: ['Norwalk Community College', 'Manchester Community College', 'Housatonic Community College', 'Gateway Community College'],
  Delaware: ['Delaware Technical Community College - Wilmington', 'Delaware Technical Community College - Dover', 'Delaware Technical Community College - Georgetown'],
  Florida: ['Miami Dade College', 'Broward College', 'Valencia College', 'Santa Fe College', 'St. Petersburg College', 'Palm Beach State College', 'Hillsborough Community College'],
  Georgia: ['Atlanta Metropolitan State College', 'Georgia Piedmont Technical College', 'Gwinnett Technical College', 'Georgia Highlands College'],
  Hawaii: ['Honolulu Community College', 'Kapiolani Community College', 'Leeward Community College', 'Windward Community College'],
  Idaho: ['College of Western Idaho', 'College of Southern Idaho', 'North Idaho College'],
  Illinois: ['Harold Washington College', 'College of DuPage', 'Triton College', 'Oakton College', 'Elgin Community College'],
  Indiana: ['Ivy Tech Community College - Indianapolis', 'Ivy Tech Community College - Bloomington', 'Ivy Tech Community College - Fort Wayne'],
  Iowa: ['Des Moines Area Community College', 'Kirkwood Community College', 'Iowa Western Community College'],
  Kansas: ['Johnson County Community College', 'Butler Community College', 'Hutchinson Community College'],
  Kentucky: ['Bluegrass Community and Technical College', 'Jefferson Community and Technical College'],
  Louisiana: ['Delgado Community College', 'Baton Rouge Community College', 'River Parishes Community College'],
  Maine: ['Southern Maine Community College', 'Central Maine Community College'],
  Maryland: ['Montgomery College', 'Community College of Baltimore County', 'Anne Arundel Community College', 'Howard Community College'],
  Massachusetts: ['Bunker Hill Community College', 'Massachusetts Bay Community College', 'Middlesex Community College'],
  Michigan: ['Washtenaw Community College', 'Oakland Community College', 'Macomb Community College', 'Grand Rapids Community College', 'Wayne County Community College'],
  Minnesota: ['Normandale Community College', 'Minneapolis Community and Technical College', 'Century College'],
  Mississippi: ['Hinds Community College', 'Jones College', 'Mississippi Gulf Coast Community College'],
  Missouri: ['St. Louis Community College', 'Metropolitan Community College - Kansas City', 'Ozarks Technical Community College'],
  Montana: ['Missoula College', 'Great Falls College'],
  Nebraska: ['Metropolitan Community College - Omaha', 'Southeast Community College'],
  Nevada: ['College of Southern Nevada', 'Truckee Meadows Community College'],
  'New Hampshire': ['Nashua Community College', 'Manchester Community College'],
  'New Jersey': ['Bergen Community College', 'Middlesex College', 'Union County College', 'County College of Morris'],
  'New Mexico': ['Central New Mexico Community College', 'Santa Fe Community College'],
  'New York': ['LaGuardia Community College', 'Borough of Manhattan Community College', 'Nassau Community College', 'Suffolk County Community College', 'Hudson Valley Community College', 'Monroe Community College'],
  'North Carolina': ['Wake Technical Community College', 'Central Piedmont Community College', 'Durham Technical Community College'],
  'North Dakota': ['Bismarck State College', 'Lake Region State College'],
  Ohio: ['Cuyahoga Community College', 'Columbus State Community College', 'Sinclair Community College', 'Cincinnati State Technical and Community College'],
  Oklahoma: ['Tulsa Community College', 'Oklahoma City Community College', 'Rose State College'],
  Oregon: ['Portland Community College', 'Lane Community College', 'Chemeketa Community College'],
  Pennsylvania: ['Community College of Philadelphia', 'Montgomery County Community College', 'Harrisburg Area Community College', 'Community College of Allegheny County'],
  'Rhode Island': ['Community College of Rhode Island'],
  'South Carolina': ['Trident Technical College', 'Greenville Technical College', 'Midlands Technical College'],
  'South Dakota': ['Southeast Technical College', 'Lake Area Technical College'],
  Tennessee: ['Nashville State Community College', 'Pellissippi State Community College', 'Chattanooga State Community College'],
  Texas: ['Austin Community College', 'Houston Community College', 'Dallas College', 'San Jacinto College', 'Lone Star College', 'Tarrant County College', 'Collin College', 'Alamo Colleges (San Antonio)'],
  Utah: ['Salt Lake Community College', 'Snow College'],
  Vermont: ['Community College of Vermont'],
  Virginia: ['Northern Virginia Community College', 'J. Sargeant Reynolds Community College', 'Tidewater Community College'],
  Washington: ['Bellevue College', 'Seattle Central College', 'North Seattle College', 'Highline College', 'Green River College'],
  'West Virginia': ['BridgeValley Community and Technical College', 'West Virginia Northern Community College'],
  Wisconsin: ['Madison College', 'Milwaukee Area Technical College'],
  Wyoming: ['Laramie County Community College', 'Casper College'],
};

const STEPS = {

  student_type: {
    id: 'student_type',
    title: 'Let\u2019s start!',
    subtitle: 'First, who are you?',
    field: 'options',
    profileKey: 'student_type',
    splitImage: 'assets/who-are-you.webp',
    options: [
      { value: 'high_school', label: 'I am a High school student' },
      { value: 'community_college', label: 'I am a Community College student' },
    ],
    branch: { high_school: 'hs_grade', community_college: 'cc_college_name' },
  },

  // --------------------------------------------------------------------
  // HIGH SCHOOL FLOW -- major now comes BEFORE courses, so the courses
  // step can prioritize suggestions based on the student's stated major.
  // --------------------------------------------------------------------
  hs_grade: {
    id: 'hs_grade', flow: 'hs', order: 1,
    title: 'Quick question:',
    subtitle: 'What grade are you in?',
    field: 'options',
    profileKey: 'grade',
    imageOptions: true,
    options: [
      { value: '9th', label: '9th Grade', image: 'assets/grade9.webp' },
      { value: '10th', label: '10th Grade', image: 'assets/grade10.webp' },
      { value: '11th', label: '11th Grade', image: 'assets/grade11.webp' },
      { value: '12th', label: 'I\u2019m a senior!', image: 'assets/gradesenior.webp' },
    ],
    next: 'hs_gpa',
  },

  hs_gpa: {
    id: 'hs_gpa', flow: 'hs', order: 2,
    title: 'I know it\u2019s personal but..',
    subtitle: 'In order to do this right, I need your GPA',
    field: 'dual-slider',
    profileKey: 'gpa',
    sliders: [
      { key: 'unweighted', label: 'What’s your unweighted GPA?', min: 0, max: 4.0, step: 0.1, default: 3.5 },
      { key: 'weighted', label: 'What’s your weighted GPA?', min: 0, max: 5.0, step: 0.1, default: 3.5, optional: true },
    ],
    splitImage: 'assets/gpa.webp',
    next: 'hs_major',
  },

  hs_major: {
    id: 'hs_major', flow: 'hs', order: 3,
    title: 'What do you see yourself studying in college?',
    subtitle: 'It\u2019s okay if you are still undecided.',
    helperText: 'I know your academic interests aren\u2019t something that can always be captured with a single button. Feel free to share your intended major in the chat, along with any details or goals you think are relevant.',
    field: 'freeform-only',
    profileKey: 'major',
    freeformPlaceholder: 'What area of knowledge interests you the most?',
    splitImage: 'assets/major.webp',
    next: 'hs_courses',
  },

  hs_courses: {
    id: 'hs_courses', flow: 'hs', order: 4,
    title: 'Let\u2019s talk about academics...',
    subtitle: 'What courses have you taken, and their grades',
    field: 'card-stack',
    profileKey: 'courses',
    cardFields: [
      { key: 'type', label: 'Course Type', placeholder: 'Select type', type: 'select', options: HS_COURSE_TYPE_OPTIONS },
      { key: 'subject', label: 'Subject', placeholder: 'Select subject', type: 'select', options: HS_SUBJECT_OPTIONS },
      { key: 'name', label: 'Class Name', placeholder: 'e.g U.S History', type: 'autocomplete', suggestions: HS_COURSE_SUGGESTIONS },
      { key: 'grade', label: 'Grade', placeholder: 'Select grade', type: 'select', options: GRADE_OPTIONS },
    ],
    transcriptUpload: true,
    splitImage: 'assets/grades2.webp',
    splitImagePosition: 'right',
    next: 'hs_ap_ib',
  },

  hs_ap_ib: {
    id: 'hs_ap_ib', flow: 'hs', order: 5,
    title: 'Any AP or IB classes?',
    subtitle: 'List them here with your grades.',
    field: 'card-stack',
    profileKey: 'ap_ib_courses',
    cardFields: [
      { key: 'name', label: 'Class Name', placeholder: 'e.g U.S History', type: 'autocomplete', suggestions: HS_COURSE_SUGGESTIONS },
      { key: 'grade', label: 'Grade', placeholder: 'Select grade', type: 'select', options: GRADE_OPTIONS },
      { key: 'type', label: 'Course Type', placeholder: 'Select type', type: 'select', options: HS_COURSE_TYPE_OPTIONS },
    ],
    splitImage: 'assets/ap-and-ib.webp',
    skippable: true,
    next: 'hs_extracurriculars',
  },

  hs_extracurriculars: {
    id: 'hs_extracurriculars', flow: 'hs', order: 6,
    title: 'When you\u2019re not in class....',
    subtitle: 'What extracurriculars are you part of?',
    helperText: 'I understand that extracurricular activities can range from sports to taking care of elderly family members at home. For this reason, in this section you can enter them directly in the chat.',
    field: 'freeform-only',
    profileKey: 'extracurriculars',
    freeformPlaceholder: 'Tell me about your extracurricular activities. If you have one, include your role and how long you\u2019ve been involved. If not, that\u2019s completely fine, feel free to share how you contribute to your community in your own way.',
    splitImage: 'assets/extracurriculars.webp',
    next: 'hs_college_type',
  },

  hs_college_type: {
    id: 'hs_college_type', flow: 'hs', order: 7,
    title: 'What is your college type preference?',
    subtitle: 'Remember that everything is valid and each path is different...',
    field: 'options',
    profileKey: 'college_type_preference',
    options: [
      { value: 'not_sure', label: 'Not sure... Yet.' },
      { value: 'community_college', label: 'Community College' },
      { value: 'open', label: 'I\u2019m open to anything' },
      { value: 'four_year_only', label: 'Only 4-Year Universities' },
    ],
    splitImage: 'assets/preference.webp',
    next: 'hs_state',
  },

  hs_state: {
    id: 'hs_state', flow: 'hs', order: 8,
    title: 'Where do you call home?',
    subtitle: 'Your state of residency affects crucial factors such as in-state tuition, grant eligibility and more...',
    field: 'dropdown',
    stateOnly: true,
    includeSchoolField: true,
    schoolFieldLabel: 'Type your high school name',
    profileKey: 'state',
    splitImage: 'assets/plane.webp',
    next: 'hs_out_of_state',
  },

  hs_out_of_state: {
    id: 'hs_out_of_state', flow: 'hs', order: 9,
    title: 'Are you open to out-of-state schools?',
    subtitle: 'It helps me narrow down your options based on the state(s) you\u2019re considering.',
    field: 'options',
    profileKey: 'out_of_state_preference',
    options: [
      { value: 'in_state_only', label: 'I want to stay in my state' },
      { value: 'explore', label: 'I want to explore the country' },
    ],
    splitImage: 'assets/dontleaveusobee.webp',
    skippable: true,
    next: 'hs_specific_schools',
  },

  hs_specific_schools: {
    id: 'hs_specific_schools', flow: 'hs', order: 10,
    title: 'Do you have any specific schools in mind?',
    subtitle: 'Or would you like me to recommend some from scratch?',
    field: 'options',
    profileKey: 'has_specific_schools',
    options: [
      { value: 'has_list', label: 'I have my schools' },
      { value: 'build_list', label: 'Build my school list' },
    ],
    optionsRequireFreeform: ['has_list'],
    freeformPlaceholder: 'If you do, type your schools in mind here.',
    splitImage: 'assets/schoolsbubble.webp',
    skippable: true,
    next: 'hs_first_gen',
  },

  hs_first_gen: {
    id: 'hs_first_gen', flow: 'hs', order: 11,
    title: 'Unlock first-gen specific resources and programs in your further recommendations',
    subtitle: 'Are you a first-gen student?',
    field: 'options',
    profileKey: 'first_gen',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'not_sure', label: 'Not sure' },
    ],
    splitImage: 'assets/firstgen.webp',
    skippable: true,
    next: 'hs_test_scores',
  },

  hs_test_scores: {
    id: 'hs_test_scores', flow: 'hs', order: 12,
    title: 'While many schools are test-optional,',
    subtitle: 'Feel free to include your SAT or ACT scores.',
    field: 'score-card',
    profileKey: 'test_scores',
    scoreFields: [
      { key: 'sat', label: 'SAT', placeholder: '400-1600' },
      { key: 'act', label: 'ACT', placeholder: '1-36' },
    ],
    splitImage: 'assets/satandact.webp',
    skippable: true,
    next: 'thinking',
  },

  // --------------------------------------------------------------------
  // COMMUNITY COLLEGE FLOW -- major already comes before courses.
  // --------------------------------------------------------------------
  cc_college_name: {
    id: 'cc_college_name', flow: 'cc', order: 1,
    title: 'Which community college do you attend?',
    subtitle: 'This helps me determine which articulation agreement applies to you.',
    field: 'dropdown',
    cascadeCollege: true,
    profileKey: 'community_college',
    splitImage: 'assets/communitycollege.webp',
    splitImagePosition: 'right',
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
      { key: 'transferable', label: 'What\u2019s your transferable GPA?', min: 1.0, max: 4.0, step: 0.1, default: 3.5, optional: true },
    ],
    splitWide: true,
    splitImage: 'assets/gpa.webp',
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
    splitImage: 'assets/units-completed.webp',
    splitImagePosition: 'right',
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
    splitImage: 'assets/major.webp',
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
      { key: 'college', label: 'College', placeholder: 'Current or previous college', type: 'college-choice' },
      { key: 'units', label: 'Units', placeholder: 'Units', type: 'select', options: COURSE_UNITS_OPTIONS },
    ],
    transcriptUpload: true,
    splitImage: 'assets/grades2.webp',
    splitImagePosition: 'right',
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
    splitImage: 'assets/ap-and-ib.webp',
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
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'what_is_igetc', label: 'What is IGETC?', isInfo: true },
    ],
    splitImage: 'assets/igetc.webp',
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
    splitImage: 'assets/extracurriculars.webp',
    next: 'cc_out_of_state',
  },

  cc_transfer_timeline: {
    id: 'cc_transfer_timeline', flow: 'cc', order: 11,
    title: 'When do you plan to transfer?',
    subtitle: 'Remember that everything is valid and each path is different...',
    field: 'options',
    profileKey: 'transfer_timeline',
    options: [
      { value: 'next_fall', label: 'Next Fall' },
      { value: 'in_1_year', label: 'In 1 year' },
      { value: 'not_sure', label: 'Not sure... Yet.' },
    ],
    stackedImage: 'assets/dormroom.webp',
    next: 'cc_first_gen',
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
    optionsRequireFreeform: ['has_list'],
    freeformPlaceholder: 'If you do, type your schools in mind here.',
    splitImage: 'assets/schoolsbubble.webp',
    skippable: true,
    next: 'cc_transfer_timeline',
  },

  cc_out_of_state: {
    id: 'cc_out_of_state', flow: 'cc', order: 9,
    title: 'Are you open to out-of-state schools?',
    subtitle: 'It helps me narrow down your options based on the state(s) you\u2019re considering.',
    field: 'options',
    profileKey: 'out_of_state_preference',
    options: [
      { value: 'in_state_only', label: 'I want to stay in my state' },
      { value: 'explore', label: 'I want to explore the country' },
    ],
    splitImage: 'assets/dontleaveusobee.webp',
    skippable: true,
    next: 'cc_specific_schools',
  },

  cc_first_gen: {
    id: 'cc_first_gen', flow: 'cc', order: 12,
    title: 'Unlock first-gen specific resources and programs in your further recommendations',
    subtitle: 'Are you a first-gen student?',
    field: 'options',
    profileKey: 'first_gen',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
      { value: 'not_sure', label: 'Not sure' },
    ],
    splitImage: 'assets/firstgen.webp',
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
    splitImage: 'assets/satandact.webp',
    skippable: true,
    next: 'thinking',
  },
};

const FLOW_ORDER = {
  hs: ['hs_grade', 'hs_gpa', 'hs_major', 'hs_courses', 'hs_ap_ib', 'hs_extracurriculars', 'hs_college_type', 'hs_state', 'hs_out_of_state', 'hs_specific_schools', 'hs_first_gen', 'hs_test_scores'],
  cc: ['cc_college_name', 'cc_gpa', 'cc_units', 'cc_major', 'cc_courses', 'cc_ap_ib', 'cc_igetc', 'cc_extracurriculars', 'cc_out_of_state', 'cc_specific_schools', 'cc_transfer_timeline', 'cc_first_gen', 'cc_test_scores'],
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
