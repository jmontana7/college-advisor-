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
// Community college list for all 50 states + DC/Puerto Rico, compiled from
// CCCCO (California's official directory), Wikipedia, AACC state
// directories, and each state system's own site (compiled July 2026).
// Puerto Rico's coverage is intentionally incomplete (no full official list
// found); DC has no community college of its own (uses UDC Community
// College) so it isn't listed here. "Enter manually" is always offered
// regardless, for anything still missing.
// --------------------------------------------------------------------------
const COMMUNITY_COLLEGES_BY_STATE = {
  Alabama: [
    'Bevill State Community College', 'Bishop State Community College', 'Calhoun Community College', 'Central Alabama Community College',
    'Chattahoochee Valley Community College', 'Coastal Alabama Community College', 'Community College of the Air Force', 'Enterprise State Community College',
    'Gadsden State Community College', 'H. Councill Trenholm State Community College', 'J.F. Drake State Community and Technical College', 'J. F. Ingram State Technical College',
    'Jefferson State Community College', 'Lawson State Community College', 'Lurleen B. Wallace Community College', 'Marion Military Institute',
    'Northeast Alabama Community College', 'Northwest-Shoals Community College', 'Reid State Technical College', 'Shelton State Community College',
    'Snead State Community College', 'Southern Union State Community College', 'Wallace Community College', 'Wallace Community College Selma',
    'Wallace State Community College',
  ],
  Alaska: [
    'Iḷisaġvik College', 'University of Alaska Anchorage (5 community college campuses)', 'University of Alaska Fairbanks (4 community college campuses)',
    'University of Alaska Southeast (2 community college campuses)',
  ],
  Arizona: [
    'Arizona Western College', 'Central Arizona College', 'Cochise College', 'Coconino County Community College',
    'Diné College', 'Eastern Arizona College', 'Gila Community College District', 'Maricopa County Community College District',
    'Mohave Community College', 'Northland Pioneer College', 'Pima Community College', 'Tohono O’odham Community College',
    'Yavapai College',
  ],
  Arkansas: [
    'Arkansas Northeastern College', 'Arkansas State University-Beebe', 'Arkansas State University Mid-South', 'Arkansas State University-Mountain Home',
    'Arkansas State University-Newport', 'Arkansas State University Three Rivers', 'Black River Technical College', 'East Arkansas Community College',
    'National Park College', 'North Arkansas College', 'Northwest Arkansas Community College', 'Ozarka College',
    'University of Arkansas - Pulaski Technical College', 'South Arkansas Community College', 'Southeast Arkansas College', 'Southern Arkansas University Tech',
  ],
  California: [
    'Allan Hancock College', 'American River College', 'Antelope Valley College', 'Bakersfield College',
    'Barstow Community College', 'Berkeley City College', 'Butte College', 'Cabrillo College',
    'Calbright College', 'Cañada College', 'Cerritos College', 'Cerro Coso Community College',
    'Chabot College', 'Chaffey College', 'Citrus College', 'City College of San Francisco',
    'Clovis Community College', 'Coastline College', 'College of Alameda', 'College of Marin',
    'College of San Mateo', 'College of the Canyons', 'College of the Desert', 'College of the Redwoods',
    'College of the Sequoias', 'College of the Siskiyous', 'Columbia College', 'Compton College',
    'Contra Costa College', 'Copper Mountain College', 'Cosumnes River College', 'Crafton Hills College',
    'Cuesta College', 'Cuyamaca College', 'Cypress College', 'De Anza College',
    'Diablo Valley College', 'East Los Angeles College', 'El Camino College', 'Evergreen Valley College',
    'Feather River College', 'Folsom Lake College', 'Foothill College', 'Fresno City College',
    'Fullerton College', 'Gavilan College', 'Glendale Community College', 'Golden West College',
    'Grossmont College', 'Hartnell College', 'Imperial Valley College', 'Irvine Valley College',
    'Lake Tahoe Community College', 'Laney College', 'Las Positas College', 'Lassen College',
    'Long Beach City College', 'Los Angeles City College', 'Los Angeles Harbor College', 'Los Angeles Mission College',
    'Los Angeles Pierce College', 'Los Angeles Southwest College', 'Los Angeles Trade-Tech College', 'Los Angeles Valley College',
    'Los Medanos College', 'Madera Community College', 'Mendocino College', 'Merced College',
    'Merritt College', 'MiraCosta College', 'Mission College', 'Modesto Junior College',
    'Monterey Peninsula College', 'Moorpark College', 'Moreno Valley College', 'Mt. San Antonio College',
    'Mt. San Jacinto College', 'Napa Valley College', 'Norco College', 'North Orange Continuing Education',
    'Ohlone College', 'Orange Coast College', 'Oxnard College', 'Palo Verde College',
    'Palomar College', 'Pasadena City College', 'Porterville College', 'Reedley College',
    'Rio Hondo College', 'Riverside City College', 'Sacramento City College', 'Saddleback College',
    'San Bernardino Valley College', 'San Diego City College', 'San Diego College of Continuing Education', 'San Diego Mesa College',
    'San Diego Miramar College', 'San Joaquin Delta College', 'San José City College', 'Santa Ana College',
    'Santa Barbara City College', 'Santa Monica College', 'Santa Rosa Junior College', 'Santiago Canyon College',
    'Shasta College', 'Sierra College', 'Skyline College', 'Solano Community College',
    'Southwestern College', 'Taft College', 'Ventura College', 'Victor Valley College',
    'Coalinga College (West Hills)', 'Lemoore College (West Hills)', 'West Los Angeles College', 'West Valley College',
    'Woodland Community College', 'Yuba College',
  ],
  Colorado: [
    'Aims Community College', 'Arapahoe Community College', 'Colorado Community Colleges Online', 'Colorado Mountain College',
    'Colorado Northwestern Community College', 'Community College of Aurora', 'Community College of Denver', 'Front Range Community College',
    'Lamar Community College', 'Morgan Community College', 'Northeastern Junior College', 'Otero College',
    'Pikes Peak State College', 'Pueblo Community College', 'Red Rocks Community College', 'Trinidad State College',
    'Western Colorado Community College',
  ],
  Connecticut: [
    'Asnuntuck Community College', 'Capital Community College', 'Gateway Community College', 'Housatonic Community College',
    'Manchester Community College', 'Middlesex Community College', 'Naugatuck Valley Community College', 'Northwestern Connecticut Community College',
    'Norwalk Community College', 'Quinebaug Valley Community College', 'Three Rivers Community College', 'Tunxis Community College',
  ],
  Delaware: ['Delaware Technical Community College (Owens/Georgetown, Stanton, Terry/Dover, Wilmington campuses)'],
  Florida: [
    'Broward College', 'Chipola College', 'College of Central Florida', 'The College of the Florida Keys',
    'Daytona State College', 'Eastern Florida State College', 'Florida Gateway College', 'Florida SouthWestern State College',
    'Florida State College at Jacksonville', 'Gulf Coast State College', 'Hillsborough Community College', 'Indian River State College',
    'Lake-Sumter State College', 'Miami Dade College', 'North Florida College', 'Northwest Florida State College',
    'Palm Beach State College', 'Pasco-Hernando State College', 'Pensacola State College', 'Polk State College',
    'St. Johns River State College', 'St. Petersburg College', 'Santa Fe College', 'Seminole State College of Florida',
    'South Florida State College', 'State College of Florida, Manatee-Sarasota', 'Tallahassee Community College', 'Valencia College',
  ],
  Georgia: [
    'Albany Technical College', 'Altamaha Technical College', 'Athens Technical College', 'Atlanta Technical College',
    'Augusta Technical College', 'Central Georgia Technical College', 'Chattahoochee Technical College', 'Coastal Pines Technical College',
    'Columbus Technical College', 'Georgia Northwestern Technical College', 'Georgia Piedmont Technical College', 'Gwinnett Technical College',
    'Lanier Technical College', 'Moultrie Technical College', 'North Georgia Technical College', 'Oconee Fall Line Technical College',
    'Ogeechee Technical College', 'Savannah Technical College', 'South Georgia Technical College', 'Southeastern Technical College',
    'Southern Crescent Technical College', 'Southern Regional Technical College', 'West Georgia Technical College', 'Wiregrass Georgia Technical College',
  ],
  Hawaii: [
    'Hawaii Community College', 'Honolulu Community College', 'Kapiolani Community College', 'Kauai Community College',
    'Leeward Community College', 'University of Hawaii Maui College', 'Windward Community College',
  ],
  Idaho: ['North Idaho College', 'College of Western Idaho', 'College of Southern Idaho', 'College of Eastern Idaho'],
  Illinois: [
    'Black Hawk College', 'Carl Sandburg College', 'City Colleges of Chicago', 'College of DuPage',
    'College of Lake County', 'Danville Area Community College', 'Elgin Community College', 'Harper College',
    'Heartland Community College', 'Highland Community College', 'Illinois Central College', 'Illinois Eastern Community Colleges',
    'Illinois Valley Community College', 'John A. Logan College', 'John Wood Community College', 'Joliet Junior College',
    'Kankakee Community College', 'Kaskaskia College', 'Kishwaukee College', 'Lake Land College',
    'Lewis and Clark Community College', 'Lincoln Land Community College', 'McHenry County College', 'Moraine Valley Community College',
    'Morton College', 'Oakton College', 'Parkland College', 'Prairie State College',
    'Rend Lake College', 'Richland Community College', 'Rock Valley College', 'Sauk Valley Community College',
    'Shawnee Community College', 'South Suburban College', 'Southeastern Illinois College', 'Southwestern Illinois College',
    'Spoon River College', 'Triton College', 'Waubonsee Community College',
  ],
  Indiana: ['Ivy Tech Community College of Indiana (30 campuses statewide)'],
  Iowa: [
    'Des Moines Area Community College', 'Eastern Iowa Community Colleges', 'Hawkeye Community College', 'Indian Hills Community College',
    'Iowa Central Community College', 'Iowa Lakes Community College', 'Ellsworth Community College', 'Marshalltown Community College',
    'Iowa Western Community College', 'Kirkwood Community College', 'North Iowa Area Community College', 'Northeast Iowa Community College',
    'Northwest Iowa Community College', 'Southeastern Community College (Iowa)', 'Southwestern Community College (Iowa)', 'Western Iowa Tech Community College',
  ],
  Kansas: [
    'Allen Community College', 'Barton Community College', 'Butler Community College', 'Cloud County Community College',
    'Coffeyville Community College', 'Colby Community College', 'Cowley College', 'Dodge City Community College',
    'Donnelly College', 'Fort Scott Community College', 'Garden City Community College', 'Highland Community College (Kansas)',
    'Hutchinson Community College', 'Independence Community College', 'Johnson County Community College', 'Kansas City Kansas Community College',
    'Labette Community College', 'Neosho County Community College', 'Pratt Community College', 'Seward County Community College',
  ],
  Kentucky: [
    'Ashland Community and Technical College', 'Big Sandy Community and Technical College', 'Bluegrass Community and Technical College', 'Elizabethtown Community and Technical College',
    'Gateway Community and Technical College', 'Hazard Community and Technical College', 'Henderson Community College', 'Hopkinsville Community College',
    'Jefferson Community and Technical College', 'Madisonville Community College', 'Maysville Community and Technical College', 'Owensboro Community and Technical College',
    'Somerset Community College', 'Southcentral Kentucky Community and Technical College', 'Southeast Kentucky Community and Technical College', 'West Kentucky Community and Technical College',
  ],
  Louisiana: [
    'Baton Rouge Community College', 'Bossier Parish Community College', 'Central Louisiana Technical Community College', 'Delgado Community College',
    'L.E. Fletcher Technical Community College', 'Louisiana Delta Community College', 'Louisiana Technical College', 'Northshore Technical Community College',
    'Northwest Louisiana Technical College', 'Nunez Community College', 'River Parishes Community College', 'South Central Louisiana Technical College',
    'South Louisiana Community College', 'Sowela Technical Community College',
  ],
  Maine: [
    'Central Maine Community College', 'Eastern Maine Community College', 'Kennebec Valley Community College', 'Northern Maine Community College',
    'Southern Maine Community College', 'Washington County Community College', 'York County Community College',
  ],
  Maryland: [
    'Allegany College of Maryland', 'Anne Arundel Community College', 'Baltimore City Community College', 'Carroll Community College',
    'Cecil College', 'Chesapeake College', 'College of Southern Maryland', 'Community College of Baltimore County',
    'Frederick Community College', 'Garrett College', 'Hagerstown Community College', 'Harford Community College',
    'Howard Community College', 'Montgomery College', 'Prince George’s Community College', 'Wor-Wic Community College',
  ],
  Massachusetts: [
    'Berkshire Community College', 'Bristol Community College', 'Bunker Hill Community College', 'Cape Cod Community College',
    'Greenfield Community College', 'Holyoke Community College', 'Massachusetts Bay Community College', 'Massasoit Community College',
    'Middlesex Community College (Massachusetts)', 'Mount Wachusett Community College', 'North Shore Community College', 'Northern Essex Community College',
    'Quinsigamond Community College', 'Roxbury Community College', 'Springfield Technical Community College',
  ],
  Michigan: [
    'Alpena Community College', 'Bay de Noc Community College', 'Bay Mills Community College', 'Delta College',
    'Glen Oaks Community College', 'Gogebic Community College', 'Grand Rapids Community College', 'Henry Ford College',
    'Jackson College', 'Kalamazoo Valley Community College', 'Kellogg Community College', 'Keweenaw Bay Ojibwa Community College',
    'Kirtland Community College', 'Lake Michigan College', 'Lansing Community College', 'Macomb Community College',
    'Mid Michigan Community College', 'Monroe County Community College', 'Montcalm Community College', 'Mott Community College',
    'Muskegon Community College', 'North Central Michigan College', 'Northwestern Michigan College', 'Oakland Community College',
    'St. Clair County Community College', 'Schoolcraft College', 'Southwestern Michigan College', 'Washtenaw Community College',
    'Wayne County Community College District', 'West Shore Community College',
  ],
  Minnesota: [
    'Alexandria Technical and Community College', 'Anoka-Ramsey Community College', 'Anoka Technical College', 'Central Lakes College',
    'Century College', 'Dakota County Technical College', 'Fond du Lac Tribal and Community College', 'Hennepin Technical College',
    'Hibbing Community College', 'Inver Hills Community College', 'Itasca Community College', 'Lake Superior College',
    'Mesabi Range College', 'Minneapolis Community and Technical College', 'Minnesota State College Southeast', 'Minnesota State Community and Technical College',
    'Minnesota West Community and Technical College', 'Normandale Community College', 'North Hennepin Community College', 'Northland Community & Technical College',
    'Pine Technical and Community College', 'Rainy River Community College', 'Red Lake Nation College', 'Ridgewater College',
    'Riverland Community College', 'Rochester Community and Technical College', 'St. Cloud Technical and Community College', 'Saint Paul College',
    'South Central College', 'Vermilion Community College', 'White Earth Tribal and Community College',
  ],
  Mississippi: [
    'Coahoma Community College', 'Copiah-Lincoln Community College', 'East Central Community College', 'East Mississippi Community College',
    'Hinds Community College', 'Holmes Community College', 'Itawamba Community College', 'Jones County Junior College',
    'Meridian Community College', 'Mississippi Delta Community College', 'Mississippi Gulf Coast Community College', 'Northeast Mississippi Community College',
    'Northwest Mississippi Community College', 'Pearl River Community College', 'Southwest Mississippi Community College',
  ],
  Missouri: [
    'Crowder College', 'East Central College', 'Jefferson College (Missouri)', 'Metropolitan Community College (Missouri)',
    'Mineral Area College', 'Missouri State University-West Plains', 'Moberly Area Community College', 'North Central Missouri College',
    'Ozarks Technical Community College', 'St. Charles Community College', 'St. Louis Community College', 'State Fair Community College',
    'State Technical College of Missouri', 'Three Rivers College (Missouri)',
  ],
  Montana: [
    'Aaniiih Nakoda College', 'Blackfeet Community College', 'Chief Dull Knife College', 'City College at Montana State University Billings',
    'Dawson Community College', 'Flathead Valley Community College', 'Fort Peck Community College', 'Gallatin College Montana State University',
    'Great Falls College Montana State University', 'Helena College University of Montana', 'Little Big Horn College', 'Miles Community College',
    'Missoula College University of Montana', 'Montana Technological University', 'Salish Kootenai College', 'Stone Child College',
    'University of Montana Bitterroot College',
  ],
  Nebraska: [
    'Central Community College', 'Little Priest Tribal College', 'Metropolitan Community College (Nebraska)', 'Mid-Plains Community College',
    'Nebraska Indian Community College', 'Northeast Community College', 'Southeast Community College', 'Western Nebraska Community College',
  ],
  Nevada: ['College of Southern Nevada', 'Great Basin College', 'Truckee Meadows Community College', 'Western Nevada College'],
  'New Hampshire': [
    'Great Bay Community College', 'Lakes Region Community College', 'Manchester Community College', 'Nashua Community College',
    'NHTI - Concord’s Community College', 'River Valley Community College', 'White Mountains Community College',
  ],
  'New Jersey': [
    'Atlantic Cape Community College', 'Bergen Community College', 'Brookdale Community College', 'Camden County College',
    'County College of Morris', 'Essex County College', 'Hudson County Community College', 'Mercer County Community College',
    'Middlesex College (New Jersey)', 'Ocean County College', 'Passaic County Community College', 'Raritan Valley Community College',
    'Rowan College at Burlington County', 'Rowan College of South Jersey', 'Salem Community College', 'Sussex County Community College',
    'Union College (New Jersey)', 'Warren County Community College',
  ],
  'New Mexico': [
    'Central New Mexico Community College', 'Clovis Community College (New Mexico)', 'Diné College', 'Doña Ana Community College',
    'Luna Community College', 'Mesalands Community College', 'New Mexico Junior College', 'New Mexico Military Institute',
    'New Mexico State University Alamogordo', 'Northern New Mexico College', 'San Juan College', 'Santa Fe Community College',
    'Southwestern Indian Polytechnic Institute',
  ],
  'New York': [
    'Borough of Manhattan Community College', 'Bronx Community College', 'Cayuga Community College', 'Clinton Community College (New York)',
    'Columbia-Greene Community College', 'Corning Community College', 'Dutchess Community College', 'Finger Lakes Community College',
    'Fulton-Montgomery Community College', 'Genesee Community College', 'Guttman Community College', 'Herkimer County Community College',
    'Hostos Community College', 'Hudson Valley Community College', 'Jamestown Community College', 'Jefferson Community College (Watertown, New York)',
    'Kingsborough Community College', 'LaGuardia Community College', 'Mohawk Valley Community College', 'Monroe Community College',
    'Nassau Community College', 'North Country Community College', 'Onondaga Community College', 'Queensborough Community College',
    'Rockland Community College', 'Schenectady County Community College', 'Suffolk County Community College', 'SUNY Adirondack',
    'SUNY Broome Community College', 'SUNY Erie', 'SUNY Niagara', 'SUNY Orange',
    'SUNY Sullivan', 'SUNY Ulster', 'Tompkins Cortland Community College', 'Westchester Community College',
  ],
  'North Carolina': [
    'Alamance Community College', 'Asheville-Buncombe Technical Community College', 'Beaufort County Community College', 'Bladen Community College',
    'Blue Ridge Community College (North Carolina)', 'Brunswick Community College', 'Caldwell Community College & Technical Institute', 'Cape Fear Community College',
    'Carteret Community College', 'Catawba Valley Community College', 'Central Carolina Community College', 'Central Piedmont Community College',
    'Cleveland Community College', 'Coastal Carolina Community College', 'College of The Albemarle', 'Craven Community College',
    'Davidson-Davie Community College', 'Durham Technical Community College', 'Edgecombe Community College', 'Fayetteville Technical Community College',
    'Forsyth Technical Community College', 'Gaston College', 'Guilford Technical Community College', 'Halifax Community College',
    'Haywood Community College', 'Isothermal Community College', 'James Sprunt Community College', 'Johnston Community College',
    'Lenoir Community College', 'Martin Community College', 'Mayland Community College', 'McDowell Technical Community College',
    'Mitchell Community College', 'Montgomery Community College (North Carolina)', 'Nash Community College', 'Pamlico Community College',
    'Piedmont Community College', 'Pitt Community College', 'Randolph Community College', 'Richmond Community College',
    'Roanoke-Chowan Community College', 'Robeson Community College', 'Rockingham Community College', 'Rowan-Cabarrus Community College',
    'Sampson Community College', 'Sandhills Community College', 'South Piedmont Community College', 'Southeastern Community College (North Carolina)',
    'Southwestern Community College (North Carolina)', 'Stanly Community College', 'Surry Community College', 'Tri-County Community College',
    'Vance-Granville Community College', 'Wake Technical Community College', 'Wayne Community College', 'Western Piedmont Community College',
    'Wilkes Community College', 'Wilson Community College',
  ],
  'North Dakota': [
    'Bismarck State College', 'Cankdeska Cikana Community College', 'Dakota College at Bottineau', 'Lake Region State College',
    'North Dakota State College of Science', 'Nueta Hidatsa Sahnish College', 'Sitting Bull College', 'Turtle Mountain Community College',
    'United Tribes Technical College', 'Williston State College',
  ],
  Ohio: [
    'Belmont College', 'Central Ohio Technical College', 'Cincinnati State Technical and Community College', 'Clark State College',
    'Columbus State Community College', 'Cuyahoga Community College', 'Eastern Gateway Community College', 'Edison State Community College',
    'Hocking College', 'Lakeland Community College', 'Lorain County Community College', 'Marion Technical College',
    'North Central State College', 'Northwest State Community College', 'Ohio State University Agricultural Technical Institute', 'Owens Community College',
    'Rhodes State College', 'University of Rio Grande (Rio Grande Community College)', 'Sinclair Community College', 'Southern State Community College',
    'Stark State College', 'Terra State Community College', 'University of Cincinnati Clermont College', 'Washington State College of Ohio',
    'Zane State College',
  ],
  Oklahoma: [
    'Carl Albert State College', 'Connors State College', 'Eastern Oklahoma State College', 'Murray State College',
    'Northeastern Oklahoma A&M College', 'Northern Oklahoma College', 'Oklahoma City Community College', 'Redlands Community College',
    'Rose State College', 'Seminole State College (Oklahoma)', 'Tulsa Community College', 'Western Oklahoma State College',
  ],
  Oregon: [
    'Blue Mountain Community College', 'Central Oregon Community College', 'Chemeketa Community College', 'Clackamas Community College',
    'Clatsop Community College', 'Columbia Gorge Community College', 'Klamath Community College', 'Lane Community College',
    'Linn-Benton Community College', 'Mt. Hood Community College', 'Oregon Coast Community College', 'Portland Community College',
    'Rogue Community College', 'Southwestern Oregon Community College', 'Tillamook Bay Community College', 'Treasure Valley Community College',
    'Umpqua Community College',
  ],
  Pennsylvania: [
    'Bucks County Community College', 'Butler County Community College', 'Community College of Allegheny County', 'Community College of Beaver County',
    'Community College of Philadelphia', 'Delaware County Community College', 'Erie County Community College', 'Harrisburg Area Community College',
    'Lehigh Carbon Community College', 'Luzerne County Community College', 'Montgomery County Community College', 'Northampton Community College',
    'Pennsylvania Highlands Community College', 'Reading Area Community College', 'Westmoreland County Community College',
  ],
  'Puerto Rico': ['Instituto Comercial de Puerto Rico (partial data only -- full PR list not verified)'],
  'Rhode Island': ['Community College of Rhode Island'],
  'South Carolina': [
    'Aiken Technical College', 'Central Carolina Technical College', 'Denmark Technical College', 'Florence-Darlington Technical College',
    'Greenville Technical College', 'Horry-Georgetown Technical College', 'Midlands Technical College', 'Northeastern Technical College',
    'Orangeburg-Calhoun Technical College', 'Piedmont Technical College', 'Spartanburg Community College', 'Technical College of the Lowcountry',
    'Tri-County Technical College', 'Trident Technical College', 'Williamsburg Technical College', 'York Technical College',
  ],
  'South Dakota': [
    'Lake Area Technical College', 'Mitchell Technical College', 'Oglala Lakota College', 'Sisseton Wahpeton College',
    'Southeast Technical College', 'Western Dakota Technical College',
  ],
  Tennessee: [
    'Chattanooga State Community College', 'Cleveland State Community College', 'Columbia State Community College', 'Dyersburg State Community College',
    'Jackson State Community College', 'Motlow State Community College', 'Nashville State Community College', 'Northeast State Community College',
    'Pellissippi State Community College', 'Roane State Community College', 'Southwest Tennessee Community College', 'Volunteer State Community College',
    'Walters State Community College',
  ],
  Texas: [
    'Alamo Colleges District', 'Alvin Community College', 'Amarillo College', 'Angelina College',
    'Austin Community College District', 'Blinn College', 'Brazosport College', 'Central Texas College',
    'Cisco College', 'Clarendon College (Texas)', 'Coastal Bend College', 'College of the Mainland',
    'Collin College', 'Dallas College', 'Del Mar College', 'El Paso Community College',
    'Frank Phillips College', 'Galveston College', 'Grayson College', 'Hill College',
    'Houston Community College', 'Howard College', 'Kilgore College', 'Laredo College',
    'Lee College', 'Lone Star College System', 'McLennan Community College', 'Midland College',
    'Navarro College', 'North Central Texas College', 'Northeast Texas Community College', 'Odessa College',
    'Panola College', 'Paris Junior College', 'Ranger College', 'San Jacinto College',
    'South Plains College', 'South Texas College', 'Southwest Texas Junior College', 'Tarrant County College',
    'Temple College', 'Texarkana College', 'Texas Southmost College', 'Texas State Technical College',
    'Trinity Valley Community College', 'Tyler Junior College', 'Vernon College', 'Victoria College (Texas)',
    'Weatherford College', 'Western Texas College', 'Wharton County Junior College',
  ],
  Utah: [
    'Salt Lake Community College', 'Snow College', 'Bridgerland Technical College', 'Davis Technical College',
    'Dixie Technical College', 'Mountainland Technical College', 'Ogden-Weber Technical College', 'Southwest Technical College',
    'Tooele Technical College', 'Uintah Basin Technical College',
  ],
  Vermont: ['Community College of Vermont'],
  Virginia: [
    'Blue Ridge Community College (Virginia)', 'Central Virginia Community College', 'Dabney S. Lancaster Community College', 'Danville Community College',
    'Eastern Shore Community College', 'Germanna Community College', 'J. Sargeant Reynolds Community College', 'Brightpoint Community College',
    'Laurel Ridge Community College', 'Mountain Empire Community College', 'New River Community College', 'Northern Virginia Community College',
    'Patrick & Henry Community College', 'Paul D. Camp Community College', 'Piedmont Virginia Community College', 'Rappahannock Community College',
    'Southside Virginia Community College', 'Southwest Virginia Community College', 'Thomas Nelson Community College', 'Tidewater Community College',
    'Virginia Highlands Community College', 'Virginia Western Community College', 'Wytheville Community College',
  ],
  Washington: [
    'Bates Technical College', 'Bellevue College', 'Bellingham Technical College', 'Big Bend Community College',
    'Cascadia College', 'Centralia College', 'Clark College', 'Clover Park Technical College',
    'Columbia Basin College', 'Community Colleges of Spokane', 'Edmonds College', 'Everett Community College',
    'Grays Harbor College', 'Green River College', 'Highline College', 'Lake Washington Institute of Technology',
    'Lower Columbia College', 'Olympic College', 'Peninsula College', 'Pierce College (Washington)',
    'Renton Technical College', 'Seattle Colleges District', 'Shoreline Community College', 'Skagit Valley College',
    'South Puget Sound Community College', 'Tacoma Community College', 'Walla Walla Community College', 'Wenatchee Valley College',
    'Whatcom Community College', 'Yakima Valley College',
  ],
  'West Virginia': [
    'Blue Ridge Community and Technical College', 'BridgeValley Community and Technical College', 'Eastern West Virginia Community and Technical College', 'Mountwest Community and Technical College',
    'New River Community and Technical College', 'Pierpont Community and Technical College', 'Potomac State College of West Virginia University', 'Southern West Virginia Community and Technical College',
    'West Virginia Northern Community College', 'West Virginia University at Parkersburg',
  ],
  Wisconsin: [
    'College of Menominee Nation', 'Lac Courte Oreilles Ojibwa Community College', 'Milwaukee Career College', 'Blackhawk Technical College',
    'Chippewa Valley Technical College', 'Fox Valley Technical College', 'Gateway Technical College', 'Lakeshore Technical College',
    'Madison Area Technical College', 'Mid-State Technical College', 'Milwaukee Area Technical College', 'Moraine Park Technical College',
    'Nicolet Area Technical College', 'Northcentral Technical College', 'Northeast Wisconsin Technical College', 'Southwest Wisconsin Technical College',
    'Waukesha County Technical College', 'Western Technical College', 'Wisconsin Indianhead Technical College',
  ],
  Wyoming: [
    'Casper College', 'Central Wyoming College', 'Eastern Wyoming College', 'Gillette College',
    'Laramie County Community College', 'Northwest College', 'Sheridan College', 'Western Wyoming Community College',
    'Wind River Tribal College',
  ],
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
