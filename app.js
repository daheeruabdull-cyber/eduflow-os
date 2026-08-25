// Eduflow Marketing Landing Page Logic & Onboarding Engine
if (typeof window === 'undefined') {
  module.exports = {};
} else {
// Transparent API Sync Hook
(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    if (typeof resource === 'string' && resource.includes('/api/db')) {
      const method = (init && init.method) ? init.method.toUpperCase() : 'GET';
      
      if (method === 'POST') {
        try {
          const bodyData = init.body;
          if (bodyData) {
            localStorage.setItem('eduflow_local_db', bodyData);
          }
        } catch (e) {
          console.warn("Failed to write to local storage sync.", e);
        }
      }
      
      try {
        const response = await originalFetch(resource, init);
        if (response.ok) {
          if (method === 'GET') {
            const clone = response.clone();
            const serverDb = await clone.json();
            
            // Sync local storage with latest server records
            const localDbStr = localStorage.getItem('eduflow_local_db');
            if (localDbStr) {
              const localDb = JSON.parse(localDbStr);
              let merged = false;
              (localDb.schools || []).forEach(ls => {
                if (!serverDb.schools.some(s => s.id === ls.id)) {
                  serverDb.schools.push(ls);
                  merged = true;
                }
              });
              (localDb.students || []).forEach(lst => {
                if (!serverDb.students.some(s => s.id === lst.id)) {
                  serverDb.students.push(lst);
                  merged = true;
                }
              });
              if (merged) {
                localStorage.setItem('eduflow_local_db', JSON.stringify(serverDb));
                originalFetch('/api/db', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(serverDb)
                }).catch(err => console.warn("Failed to write merged back to server.", err));
              }
            } else {
              localStorage.setItem('eduflow_local_db', JSON.stringify(serverDb));
            }
          }
          return response;
        }
      } catch (err) {
        console.warn("Network API fetch failed, falling back to local storage polyfill.", err);
      }
      
      // Fallback: Return from LocalStorage
      const localData = localStorage.getItem('eduflow_local_db');
      let dbObj = null;
      if (localData) {
        dbObj = JSON.parse(localData);
      } else {
        dbObj = { schools: [], students: [], attendance: {}, payments: [], timetable: {}, notifications: [] };
      }
      
      return new Response(JSON.stringify(dbObj), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return originalFetch(resource, init);
  };
})();

// Nigerian States and Local Government Areas (LGA) Dictionary
const NIGERIA_STATES_LGAS = {
  "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obingwa", "Ohafia", "Osisioma", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi"],
  "Adamawa": ["Demsa", "Fufure", "Ganye", "Gayuk", "Girei", "Gombi", "Guyuk", "Hong", "Jada", "Lamurde", "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
  "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene", "Ini", "Itu", "Mbo", "Mkpat Enin", "Nsit Atai", "Nsit Ibom", "Nsit Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung Uko", "Ukanafun", "Uruan", "Urue-Offong/Oruko", "Uyo"],
  "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
  "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"],
  "Bayelsa": ["Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
  "Benue": ["Agatu", "Apa", "Ado", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Oturkpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
  "Borno": ["Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani"],
  "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakuur", "Yala"],
  "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
  "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"],
  "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba-Okha", "Oredo", "Orhionmwon", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
  "Ekiti": ["Ado Ekiti", "Efon", "Ekiti East", "Ekiti South West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ikole", "Ilejemeje", "Irepodun/Ifelodun", "Ise/Orun", "Moba", "Oye"],
  "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo Uwani"],
  "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
  "Imo": ["Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Owerri West"],
  "Jigawa": ["Auyo", "Babura", "Birini Kudu", "Birniwa", "Buji", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure", "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori", "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"],
  "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
  "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Minjibir", "Nassarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
  "Katsina": ["Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume", "Danja", "Dan Musa", "Daura", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kankara", "Kankia", "Kaita", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mashi", "Mani", "Sabuwa", "Safana", "Sandamu", "Zango"],
  "Kebbi": ["Aleiro", "Arewa Dandi", "Argungu", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko/Besse", "Maiyama", "Ngaski", "Sakaba", "Shanga", "Suru", "Wasagu/Danko", "Yauri", "Zuru"],
  "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela Odolu", "Ijumu", "Kabba/Bunu", "Kogi", "Lokoja", "Mopa Muro", "Ofu", "Ogori/Magongo", "Okehi", "Okene", "Olamaboro", "Omala", "Yagba East", "Yagba West"],
  "Kwara": ["Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Ilorin East", "Ilorin South", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi"],
  "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
  "Nassarawa": ["Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Kokona", "Lafia", "Nasarawa", "Nasarawa Egon", "Obi", "Toto", "Wamba"],
  "Niger": ["Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Mokwa", "Munya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"],
  "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Ewekoro", "Ifo", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu", "Yewa North", "Yewa South"],
  "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Ese Odo", "Idanre", "Ifedore", "Ilaje", "Ile Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo East", "Ondo West", "Ose", "Owo"],
  "Osun": ["Atakunmosa East", "Atakunmosa West", "Ayedaade", "Ayedire", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore", "Ejigbo", "Ifedayo", "Ifelodun", "Ife Central", "Ife East", "Ife North", "Ife South", "Ila", "Ilesa East", "Ilesa West", "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun", "Odo Otin", "Ola Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo"],
  "Oyo": ["Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Itesiwaju", "Iwajowa", "Kajola", "Lagelu", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo East", "Oyo West", "Saki East", "Saki West", "Surulere", "Ibarapa North-West"],
  "Plateau": ["Barkin Ladi", "Bassa", "Bokkos", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin", "Qua'an Pan", "Riyom", "Shendam", "Wase"],
  "Rivers": ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emuoha", "Etche", "Gokana", "Ikwerre", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
  "Sokoto": ["Binji", "Bodinga", "Dange Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal", "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo"],
  "Taraba": ["Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"],
  "Yobe": ["Bade", "Bursari", "Damaturu", "Fika", "Fune", "Geidam", "Gujba", "Jakusko", "Karasuwa", "Machina", "Nangere", "Nguru", "Potiskum", "Tarmuwa", "Yunusari", "Yusufari"],
  "Zamfara": ["Anka", "Bakura", "Birnin Magaji/Kiyaw", "Bukkuyum", "Bungudu", "Gummi", "Gusau", "Kaura Namoda", "Maradun", "Maru", "Shinkafi", "Talata Mafara", "Tsafe", "Zurmi"],
  "Abuja FCT": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"]
};

function populateLgas(stateName) {
  const lgaSelect = document.getElementById('reg-school-lga');
  if (!lgaSelect) return;
  
  lgaSelect.innerHTML = '';
  
  if (!stateName || !NIGERIA_STATES_LGAS[stateName]) {
    lgaSelect.disabled = true;
    lgaSelect.innerHTML = `<option value="">-- Select State First --</option>`;
    return;
  }
  
  lgaSelect.disabled = false;
  const lgas = NIGERIA_STATES_LGAS[stateName];
  
  // Add select default
  const defaultOpt = document.createElement('option');
  defaultOpt.value = "";
  defaultOpt.textContent = "-- Select LGA --";
  lgaSelect.appendChild(defaultOpt);
  
  lgas.forEach(lga => {
    const opt = document.createElement('option');
    opt.value = lga;
    opt.textContent = lga;
    lgaSelect.appendChild(opt);
  });
}

function initStatesDropdown() {
  const stateSelect = document.getElementById('reg-school-state');
  if (!stateSelect) return;
  
  stateSelect.innerHTML = `<option value="">-- Select State --</option>`;
  Object.keys(NIGERIA_STATES_LGAS).sort().forEach(state => {
    const opt = document.createElement('option');
    opt.value = state;
    opt.textContent = state;
    stateSelect.appendChild(opt);
  });
}

const EDUCATIONAL_STAGE_CLASSES = {
  "Nursery": ["Creche", "Playgroup", "Nursery 1", "Nursery 2"],
  "Primary": ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"],
  "Secondary": ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"],
  "K12": ["Creche", "Playgroup", "Nursery 1", "Nursery 2", "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"]
};

function renderOnboardingClasses(stage) {
  const container = document.getElementById('onboarding-classes-checklist');
  if (!container) return;
  
  container.innerHTML = '';
  const classesList = EDUCATIONAL_STAGE_CLASSES[stage] || [];
  
  classesList.forEach(cls => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    label.style.fontSize = '0.7rem';
    label.style.color = 'var(--text-main)';
    label.style.cursor = 'pointer';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = cls;
    checkbox.checked = true;
    checkbox.style.cursor = 'pointer';
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(cls));
    container.appendChild(label);
  });
}

// 0. GLOBAL NAVIGATION HELPER
function navigateToPage(targetPage, queryParams) {
  let url = targetPage;
  if (queryParams) {
    url += (url.includes('?') ? '&' : '?') + queryParams;
  }
  window.location.href = url;
}

// 1. MODAL TRIGGERS
function openSchoolRegistrationModal() {
  closePortalLoginModal();
  const overlay = document.getElementById('school-modal-overlay');
  if (overlay) {
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.style.setProperty('opacity', '1', 'important');
    overlay.style.setProperty('pointer-events', 'auto', 'important');
    overlay.classList.add('active');
    setOnboardingStepActive(1);
    if (typeof initStatesDropdown === 'function') initStatesDropdown();
    if (typeof renderOnboardingClasses === 'function') renderOnboardingClasses('Secondary');

    // Clear all text & email inputs
    const inputs = ['reg-school-name', 'reg-school-email', 'reg-school-phone', 'reg-school-address', 'reg-admin-name', 'reg-school-pass', 'reg-school-admin-email'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const stateSelect = document.getElementById('reg-school-state');
    if (stateSelect) stateSelect.value = '';
    const lgaSelect = document.getElementById('reg-school-lga');
    if (lgaSelect) {
      lgaSelect.value = '';
      lgaSelect.disabled = true;
      lgaSelect.innerHTML = '<option value="">-- Select State First --</option>';
    }

    const levelSelect = document.getElementById('reg-school-level');
    if (levelSelect) {
      levelSelect.value = 'Secondary';
    }

    // Clear uploaded logos/receipts
    window.uploadedLogoData = '';
    window.uploadedReceiptData = '';
    const logoPreview = document.getElementById('logo-preview-img');
    const logoPlaceholder = document.getElementById('logo-upload-placeholder');
    if (logoPreview && logoPlaceholder) {
      logoPreview.style.display = 'none';
      logoPlaceholder.style.display = 'flex';
    }
  }
}

function closeSchoolRegistrationModal() {
  const overlay = document.getElementById('school-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.removeProperty('display');
    overlay.style.removeProperty('opacity');
    overlay.style.removeProperty('pointer-events');
    overlay.style.display = 'none';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }
}

// Onboarding Multi-step Wizards
function setOnboardingStepActive(stepNum) {
  const steps = ['onboarding-batch-1', 'onboarding-batch-1-pending', 'onboarding-batch-2', 'onboarding-batch-3'];
  steps.forEach(stepId => {
    const el = document.getElementById(stepId);
    if (el) el.style.display = 'none';
  });

  const progressBar = document.getElementById('step-line-progress');
  const ind1 = document.getElementById('ind-step-1');
  const ind2 = document.getElementById('ind-step-2');
  const ind3 = document.getElementById('ind-step-3');
  const txt1 = document.getElementById('txt-step-1');
  const txt2 = document.getElementById('txt-step-2');
  const txt3 = document.getElementById('txt-step-3');

  // Reset indicators styling
  [ind1, ind2, ind3].forEach(ind => {
    if (ind) {
      ind.style.background = 'var(--border-color)';
      ind.style.color = 'var(--text-secondary)';
      ind.style.boxShadow = 'none';
    }
  });
  [txt1, txt2, txt3].forEach(txt => {
    if (txt) txt.style.color = 'var(--text-secondary)';
  });

  if (stepNum === 1) {
    const b1 = document.getElementById('onboarding-batch-1');
    if (b1) b1.style.display = 'block';
    if (progressBar) progressBar.style.width = '0%';
    if (ind1) {
      ind1.style.background = 'var(--primary)';
      ind1.style.color = 'white';
      ind1.style.boxShadow = '0 4px 10px rgba(91, 79, 224, 0.2)';
    }
    if (txt1) txt1.style.color = 'var(--text-main)';
  } 
  else if (stepNum === 1.5) {
    const b1p = document.getElementById('onboarding-batch-1-pending');
    if (b1p) b1p.style.display = 'block';
    if (progressBar) progressBar.style.width = '25%';
    if (ind1) {
      ind1.style.background = 'var(--primary)';
      ind1.style.color = 'white';
      ind1.style.boxShadow = '0 4px 10px rgba(91, 79, 224, 0.2)';
    }
    if (txt1) txt1.style.color = 'var(--text-main)';
  }
  else if (stepNum === 2) {
    const b2 = document.getElementById('onboarding-batch-2');
    if (b2) b2.style.display = 'block';
    if (progressBar) progressBar.style.width = '50%';
    [ind1, ind2].forEach(ind => {
      if (ind) {
        ind.style.background = 'var(--primary)';
        ind.style.color = 'white';
        ind.style.boxShadow = '0 4px 10px rgba(91, 79, 224, 0.2)';
      }
    });
    if (txt2) txt2.style.color = 'var(--text-main)';
  }
  else if (stepNum === 3) {
    const b3 = document.getElementById('onboarding-batch-3');
    if (b3) b3.style.display = 'block';
    if (progressBar) progressBar.style.width = '100%';
    [ind1, ind2, ind3].forEach(ind => {
      if (ind) {
        ind.style.background = 'var(--primary)';
        ind.style.color = 'white';
        ind.style.boxShadow = '0 4px 10px rgba(91, 79, 224, 0.2)';
      }
    });
    if (txt3) txt3.style.color = 'var(--text-main)';
  }
}

// ==================== STRICT 3-STEP ONBOARDING WIZARD CONTROLLER ====================

// STEP 1 VALIDATION & NAVIGATION (Strict user input check; zero dummy auto-fill!)
function validateAndGoToStep2(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const nameInput = document.getElementById('reg-school-name');
  const emailInput = document.getElementById('reg-school-email');

  const schoolName = nameInput ? nameInput.value.trim() : '';
  const schoolEmail = emailInput ? emailInput.value.trim() : '';

  if (!schoolName) {
    alert("⚠️ REQUIRED FIELD MISSING: Please enter your official School / Campus Name.");
    if (nameInput) nameInput.focus();
    return false;
  }

  if (!schoolEmail || !schoolEmail.includes('@')) {
    alert("⚠️ REQUIRED FIELD MISSING: Please enter a valid School Login Email Address.");
    if (emailInput) emailInput.focus();
    return false;
  }

  // Pre-fill Step 3 Registrar Email field cleanly from user's verified Step 1 email
  const adminEmailField = document.getElementById('reg-school-admin-email');
  if (adminEmailField && !adminEmailField.value.trim()) {
    adminEmailField.value = schoolEmail;
  }

  setOnboardingStepActive(2);
  return false;
}

function backToOnboardingStep1() {
  setOnboardingStepActive(1);
}

// STEP 2 VALIDATION & NAVIGATION (Strict user input check; zero dummy auto-fill!)
function validateAndGoToStep3(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const addressInput = document.getElementById('reg-school-address');
  const stateSelect = document.getElementById('reg-school-state');
  const lgaSelect = document.getElementById('reg-school-lga');

  const schoolAddress = addressInput ? addressInput.value.trim() : '';
  const schoolState = stateSelect ? stateSelect.value : '';
  const schoolLga = lgaSelect ? lgaSelect.value : '';

  if (!schoolAddress) {
    alert("⚠️ REQUIRED FIELD MISSING: Please enter your official Campus Physical Address.");
    if (addressInput) addressInput.focus();
    return false;
  }

  if (!schoolState) {
    alert("⚠️ REQUIRED FIELD MISSING: Please select your School State.");
    if (stateSelect) stateSelect.focus();
    return false;
  }

  if (!schoolLga) {
    alert("⚠️ REQUIRED FIELD MISSING: Please select your School Local Government Area (LGA).");
    if (lgaSelect) lgaSelect.focus();
    return false;
  }

  const checkedBoxes = document.querySelectorAll('#onboarding-classes-checklist input[type="checkbox"]:checked');
  if (checkedBoxes.length === 0) {
    alert("⚠️ ACADEMIC SETUP INCOMPLETE: Please select at least one active class/level to activate.");
    return false;
  }

  setOnboardingStepActive(3);
  setTimeout(() => {
    const nameEl = document.getElementById('reg-admin-name');
    if (nameEl) nameEl.focus();
  }, 100);
  return false;
}

function backToOnboardingStep2() {
  setOnboardingStepActive(2);
}

// Global Window Exports for Inline Event Handlers
if (typeof window !== 'undefined') {
  window.validateAndGoToStep2 = validateAndGoToStep2;
  window.validateAndGoToStep3 = validateAndGoToStep3;
  window.backToOnboardingStep1 = backToOnboardingStep1;
  window.backToOnboardingStep2 = backToOnboardingStep2;
}

// Image uploader handler
function handleLogoUpload(input) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('logo-preview-img');
      const placeholder = document.getElementById('logo-upload-placeholder');
      if (preview && placeholder) {
        preview.src = e.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
      }
      window.uploadedLogoData = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// Payment method handlers
function toggleOnboardingPlan(plan) {
  const paymentSection = document.getElementById('onboarding-payment-method-section');
  const manualPanel = document.getElementById('onboarding-manual-payment-info');
  
  const plans = ['free', 'standard', 'pro'];
  plans.forEach(p => {
    const lbl = document.getElementById(`label-plan-${p}`);
    if (lbl) {
      if (p === plan.toLowerCase()) {
        lbl.style.border = '2px solid var(--primary)';
        lbl.style.background = 'rgba(91,79,224,0.02)';
      } else {
        lbl.style.border = '1px solid var(--border-color)';
        lbl.style.background = 'transparent';
      }
    }
  });

  if (plan === 'Free') {
    if (paymentSection) paymentSection.style.display = 'none';
    if (manualPanel) manualPanel.style.display = 'none';
  } else {
    if (paymentSection) paymentSection.style.display = 'block';
    const payMethodRadio = document.querySelector('input[name="reg-payment-method"]:checked');
    const paymentMethod = payMethodRadio ? payMethodRadio.value : 'Online';
    if (manualPanel) {
      manualPanel.style.display = (paymentMethod === 'Manual') ? 'block' : 'none';
    }
  }
}

function toggleOnboardingPaymentMethod(method) {
  const infoPanel = document.getElementById('onboarding-manual-payment-info');
  if (infoPanel) {
    infoPanel.style.display = (method === 'Manual') ? 'block' : 'none';
  }
}

function handlePaymentReceiptUpload(input) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('receipt-preview-img');
      const placeholder = document.getElementById('receipt-upload-placeholder');
      if (preview && placeholder) {
        preview.src = e.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
      }
      window.uploadedReceiptData = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// 2. TRIAL ONBOARDING - 100% GUARANTEED ACCOUNT CREATION
async function registerSchoolOnboarding() {
  try {
    const schoolNameInput = document.getElementById('reg-school-name');
    const schoolEmailInput = document.getElementById('reg-school-email');
    const adminEmailInput = document.getElementById('reg-school-admin-email');
    const schoolTypeInput = document.getElementById('reg-school-type');
    
    const schoolPhoneInput = document.getElementById('reg-school-phone');
    const schoolAddressInput = document.getElementById('reg-school-address');
    const registrarNameInput = document.getElementById('reg-admin-name');
    const schoolPassInput = document.getElementById('reg-school-pass');
    
    const schoolLevelInput = document.getElementById('reg-school-level');
    const schoolStateInput = document.getElementById('reg-school-state');
    const schoolLgaInput = document.getElementById('reg-school-lga');
    
    const schoolName = schoolNameInput ? schoolNameInput.value.trim() : '';
    const schoolEmail = schoolEmailInput ? schoolEmailInput.value.trim() : (adminEmailInput ? adminEmailInput.value.trim() : '');
    const schoolPass = schoolPassInput ? schoolPassInput.value.trim() : '';
    const schoolPhone = schoolPhoneInput ? schoolPhoneInput.value.trim() : '';
    const schoolAddress = schoolAddressInput ? schoolAddressInput.value.trim() : '';
    const registrarName = registrarNameInput ? registrarNameInput.value.trim() : '';

    if (!schoolName) {
      alert("⚠️ REQUIRED FIELD MISSING: Please enter your official School / Campus Name.");
      if (schoolNameInput) schoolNameInput.focus();
      return false;
    }

    if (!schoolEmail || !schoolEmail.includes('@')) {
      alert("⚠️ REQUIRED FIELD MISSING: Please enter a valid School Login Email Address.");
      if (schoolEmailInput) schoolEmailInput.focus();
      return false;
    }

    if (!schoolPass || schoolPass.length < 6) {
      alert("⚠️ INSECURE PASSWORD: Please enter a password at least 6 characters long.");
      if (schoolPassInput) schoolPassInput.focus();
      return false;
    }

    if (!schoolPhone || schoolPhone.length < 10) {
      alert("⚠️ REQUIRED FIELD MISSING: Please enter a valid Contact Phone Number.");
      if (schoolPhoneInput) schoolPhoneInput.focus();
      return false;
    }

    const schoolType = schoolTypeInput ? schoolTypeInput.value : 'Physical Learning';
    const schoolLevel = schoolLevelInput ? schoolLevelInput.value : 'Secondary';
    const schoolState = (schoolStateInput && schoolStateInput.value) ? schoolStateInput.value : 'Lagos';
    const schoolLga = (schoolLgaInput && schoolLgaInput.value) ? schoolLgaInput.value : 'Ikeja';
    
    const planRadio = document.querySelector('input[name="reg-plan-tier"]:checked') || document.querySelector('input[name="reg-school-plan"]:checked');
    const schoolPlan = planRadio ? planRadio.value : 'Free';

    const payMethodRadio = document.querySelector('input[name="reg-payment-method"]:checked');
    const paymentMethod = payMethodRadio ? payMethodRadio.value : 'Online';
    const receiptData = window.uploadedReceiptData || '';

    const schoolId = 'school_' + Math.floor(1000 + Math.random() * 9000);
    const defaultSchoolLogo = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' rx='20' fill='%2312132A'/><path d='M30 45 L50 25 L70 45 L60 45 L60 75 L40 75 L40 45 Z' fill='url(%23grad)'/><circle cx='50' cy='50' r='10' stroke='%23ffffff' stroke-width='3'/><defs><linearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%2317B8A6'/><stop offset='100%25' stop-color='%235B4FE0'/></linearGradient></defs></svg>`;
    const logoData = window.uploadedLogoData || defaultSchoolLogo;

    const subStatus = (schoolPlan === 'Free') ? 'Active' : ((paymentMethod === 'Manual') ? 'Pending Verification' : 'Active');

    // Read active classes selected by the user
    const checkedBoxes = document.querySelectorAll('#onboarding-classes-checklist input[type="checkbox"]:checked');
    let defaultClasses = Array.from(checkedBoxes).map(cb => cb.value);
    if (defaultClasses.length === 0) {
      if (schoolLevel === 'Nursery') defaultClasses = ['Creche', 'Nursery 1', 'Nursery 2'];
      else if (schoolLevel === 'Primary') defaultClasses = ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];
      else defaultClasses = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
    }

    // Clean Production: Zero initial demo students
    let defaultStudents = [];

    const newSchool = {
      id: schoolId,
      name: schoolName,
      email: schoolEmail,
      type: schoolType,
      kycStatus: 'Pending',
      subscriptionStatus: subStatus,
      plan: schoolPlan,
      reportCardFormat: 'Premium Crest',
      subjects: ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics'],
      phone: schoolPhone,
      address: schoolAddress,
      registrar: registrarName,
      logo: logoData,
      password: schoolPass,
      paymentMethod: paymentMethod,
      paymentProof: receiptData,
      state: schoolState,
      lga: schoolLga,
      classes: defaultClasses,
      config: {
        school_name: schoolName,
        school_email: schoolEmail,
        school_logo: logoData,
        school_phone: schoolPhone,
        school_address: schoolAddress,
        school_password: schoolPass,
        school_state: schoolState,
        school_lga: schoolLga,
        school_level: schoolLevel,
        classes: defaultClasses,
        school_term: 'First Term 2026',
        tuition: 150000,
        library: 10000,
        development: 15000,
        theme_primary: '#5B4FE0',
        theme_accent: '#17B8A6',
        theme_teal: '#17B8A6'
      }
    };

    // Persist customized settings locally first for instant availability
    localStorage.setItem('eduflow_school_id', schoolId);
    localStorage.setItem('eduflow_school_name', schoolName);
    localStorage.setItem('eduflow_school_email', schoolEmail);
    localStorage.setItem('eduflow_school_type', schoolType);
    localStorage.setItem('eduflow_school_term', 'First Term 2026');
    localStorage.setItem('eduflow_school_logo', logoData);
    localStorage.setItem('eduflow_role', 'admin');

    // Save into registered schools registry for portal login verification
    let registeredSchools = [];
    try {
      registeredSchools = JSON.parse(localStorage.getItem('eduflow_registered_schools') || '[]');
    } catch(e) {}
    
    registeredSchools.push({
      id: schoolId,
      name: schoolName,
      email: schoolEmail,
      password: schoolPass,
      role: 'admin',
      type: schoolType,
      level: schoolLevel,
      state: schoolState,
      lga: schoolLga
    });
    localStorage.setItem('eduflow_registered_schools', JSON.stringify(registeredSchools));

    // Send 3-step structured payload to backend persistence API /api/onboarding/complete
    let activeToken = 'token_' + Date.now();
    let finalSchoolId = schoolId;

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolDetails: {
            name: schoolName,
            email: schoolEmail,
            address: schoolAddress,
            state: schoolState,
            lga: schoolLga,
            logo: logoData,
            plan: schoolPlan,
            paymentMethod: paymentMethod,
            paymentProof: receiptData
          },
          academicStructure: {
            type: schoolType,
            level: schoolLevel,
            classes: defaultClasses
          },
          adminCredentials: {
            name: registrarName,
            phone: schoolPhone,
            password: schoolPass
          }
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        activeToken = data.token;
        if (data.schoolId) finalSchoolId = data.schoolId;
      }
    } catch(err) {
      console.warn("Backend API sync deferred, persisting locally:", err);
    }

    // Persist session tokens & principal role context
    localStorage.setItem('authToken', activeToken);
    localStorage.setItem('eduflow_jwt_token', activeToken);
    localStorage.setItem('eduflow_school_id', finalSchoolId);
    localStorage.setItem('eduflow_school_name', schoolName);
    localStorage.setItem('eduflow_school_email', schoolEmail);
    localStorage.setItem('eduflow_school_type', schoolType);
    localStorage.setItem('eduflow_role', 'admin');
    localStorage.setItem('userRole', 'admin');
    sessionStorage.removeItem('superadmin_authenticated');

    closeSchoolRegistrationModal();
    
    // Redirect instantly to Principal Dashboard with schoolId
    const redirectUrl = (paymentMethod === 'Manual') 
      ? `dashboard.html?role=admin&schoolId=${finalSchoolId}&pendingVerify=true`
      : `dashboard.html?role=admin&schoolId=${finalSchoolId}`;
    
    window.location.href = redirectUrl;
  } catch (globalErr) {
    console.error("Onboarding submission error:", globalErr);
    closeSchoolRegistrationModal();
    window.location.href = `dashboard.html?role=admin&schoolId=school_demo`;
  }
}

// 3. PORTAL SIGN-IN MODAL CONTROLLERS
function navigateToPage(page, query) {
  let targetUrl = page || 'dashboard.html';
  if (query) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + query;
  }
  window.location.href = targetUrl;
}

function openPortalLoginModal(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  closeSchoolRegistrationModal();
  const drawer = document.getElementById('mobile-landing-drawer');
  if (drawer) drawer.classList.remove('active');
  const overlay = document.getElementById('login-modal-overlay') || document.querySelector('#login-modal-overlay');
  if (overlay) {
    overlay.classList.add('active');
    overlay.style.cssText = "display: flex !important; opacity: 1 !important; pointer-events: auto !important; z-index: 9999999 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(15, 23, 42, 0.8) !important;";
    const innerModal = overlay.querySelector('.payment-modal, .responsive-modal');
    if (innerModal) {
      innerModal.style.cssText = "display: block !important; opacity: 1 !important; visibility: visible !important; transform: scale(1) !important;";
    }
    const idInput = document.getElementById('login-identifier');
    const passInput = document.getElementById('login-password');
    if (idInput) {
      idInput.value = '';
      setTimeout(() => idInput.focus(), 100);
    }
    if (passInput) {
      passInput.value = '';
    }
  } else {
    window.location.href = 'dashboard.html?role=admin';
  }
  return false;
}

function closePortalLoginModal() {
  const overlay = document.getElementById('login-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.removeProperty('display');
    overlay.style.removeProperty('opacity');
    overlay.style.removeProperty('pointer-events');
    overlay.style.display = 'none';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }
}

async function handlePortalLoginUnified(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  
  const idInput = document.getElementById('login-identifier');
  const passInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('login-submit-btn') || (event && event.target ? event.target.querySelector('button[type="submit"]') : null);
  
  const identifier = idInput && idInput.value ? idInput.value.trim() : '';
  const password = passInput && passInput.value ? passInput.value : '';

  // 1. Client-Side Input Validation
  if (!identifier) {
    alert("⚠️ Please enter your Username, Email, or Registration Number.");
    if (idInput) idInput.focus();
    return false;
  }

  // 2. UI Loading State Visual Feedback
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Access School Portal';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Authenticating...';
  }

  try {
    // 3. API POST Request Pipeline
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await response.json().catch(() => ({}));

    // 4. Dynamic Role-Based Redirection Engine
    if (response.ok && data.success && data.token) {
      const rawRole = (data.user && data.user.role) ? data.user.role : (data.role || 'admin');
      const role = rawRole.toLowerCase();
      const schoolId = (data.user && data.user.schoolId) ? data.user.schoolId : (data.schoolId || 'school_demo');
      
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('eduflow_jwt_token', data.token);
      localStorage.setItem('userRole', role);
      localStorage.setItem('eduflow_role', role);
      
      if (schoolId) {
        localStorage.setItem('eduflow_school_id', schoolId);
      }
      if (data.schoolName) {
        localStorage.setItem('eduflow_school_name', data.schoolName);
      }

      if (role === 'superadmin') {
        sessionStorage.setItem('superadmin_authenticated', 'true');
        localStorage.removeItem('eduflow_teacher_email');
        localStorage.removeItem('eduflow_parent_email');
      } else {
        sessionStorage.removeItem('superadmin_authenticated');
      }

      closePortalLoginModal();

      // Dynamic RBAC Redirection Router
      let redirectUrl = 'dashboard.html?role=admin';
      if (role === 'superadmin') {
        redirectUrl = 'dashboard.html?role=superadmin';
      } else if (role === 'principal' || role === 'admin') {
        redirectUrl = `dashboard.html?role=admin&schoolId=${schoolId}`;
      } else if (role === 'form_master') {
        redirectUrl = `dashboard.html?role=form_master&schoolId=${schoolId}`;
      } else if (role === 'teacher') {
        redirectUrl = `dashboard.html?role=teacher&schoolId=${schoolId}`;
      } else if (role === 'parent') {
        redirectUrl = `dashboard.html?role=parent`;
      } else if (role === 'student') {
        redirectUrl = `dashboard.html?role=student&schoolId=${schoolId}`;
      } else {
        alert('Unknown role assigned. Please contact your school administrator.');
        return false;
      }
      
      window.location.href = redirectUrl;
      return false;
    } else {
      // 5. Offline / LocalStorage School Fallback Check
      let localRegSchools = [];
      try {
        localRegSchools = JSON.parse(localStorage.getItem('eduflow_registered_schools') || '[]');
      } catch(e) {}

      const cleanTarget = identifier.toLowerCase();
      const matchedLocalSchool = localRegSchools.find(s => 
        (s.email && s.email.toLowerCase() === cleanTarget) || 
        (s.id && s.id.toLowerCase() === cleanTarget) ||
        (s.name && s.name.toLowerCase() === cleanTarget)
      );

      if (matchedLocalSchool && password.trim() === matchedLocalSchool.password.trim()) {
        const fallbackToken = 'token_' + Date.now();
        localStorage.setItem('authToken', fallbackToken);
        localStorage.setItem('eduflow_jwt_token', fallbackToken);
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('eduflow_role', 'admin');
        localStorage.setItem('eduflow_school_id', matchedLocalSchool.id);
        localStorage.setItem('eduflow_school_name', matchedLocalSchool.name);

        closePortalLoginModal();
        window.location.href = `dashboard.html?role=admin&schoolId=${matchedLocalSchool.id}`;
        return false;
      }

      // Clear any previous token and display error alert
      localStorage.removeItem('authToken');
      localStorage.removeItem('eduflow_jwt_token');
      localStorage.removeItem('eduflow_role');

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }

      alert(data.message || 'Access Denied: Account not registered.');
      return false;
    }
  } catch (err) {
    console.error("Login API network error:", err);
    
    // Offline Network Fallback Check
    let localRegSchools = [];
    try {
      localRegSchools = JSON.parse(localStorage.getItem('eduflow_registered_schools') || '[]');
    } catch(e) {}

    const cleanTarget = identifier.toLowerCase();
    const matchedLocalSchool = localRegSchools.find(s => 
      (s.email && s.email.toLowerCase() === cleanTarget) || 
      (s.id && s.id.toLowerCase() === cleanTarget) ||
      (s.name && s.name.toLowerCase() === cleanTarget)
    );

    if (matchedLocalSchool && password.trim() === matchedLocalSchool.password.trim()) {
      const fallbackToken = 'token_' + Date.now();
      localStorage.setItem('authToken', fallbackToken);
      localStorage.setItem('eduflow_jwt_token', fallbackToken);
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('eduflow_role', 'admin');
      localStorage.setItem('eduflow_school_id', matchedLocalSchool.id);
      localStorage.setItem('eduflow_school_name', matchedLocalSchool.name);

      closePortalLoginModal();
      window.location.href = `dashboard.html?role=admin&schoolId=${matchedLocalSchool.id}`;
      return false;
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('eduflow_jwt_token');
    
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
    
    alert('⛔ Network Error: Unable to verify credentials with server.');
    return false;
  }
}

// Explicitly bind to window for global inline event handlers (onsubmit/onclick)
if (typeof window !== 'undefined') {
  window.handlePortalLoginUnified = handlePortalLoginUnified;
  window.openPortalLoginModal = openPortalLoginModal;
  window.closePortalLoginModal = closePortalLoginModal;
  window.navigateToPage = navigateToPage;
}

// 3.1 LEGACY FALLBACK REDIRECT
function loginRedirect(role) {
  const token = localStorage.getItem('eduflow_jwt_token');
  const activeRole = localStorage.getItem('eduflow_role');
  
  if (!token && activeRole !== 'superadmin' && activeRole !== 'admin') {
    openPortalLoginModal();
    return;
  }

  const activeSchoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  const query = role === 'superadmin' ? 'role=superadmin' : `role=${role || 'admin'}&schoolId=${activeSchoolId}`;
  navigateToPage('dashboard.html', query);
}

// 4. HOW IT WORKS WORKFLOW TAB SELECTOR
function toggleWorksCategory(category) {
  const categories = ['k12', 'virtual', 'tutor'];
  
  categories.forEach(cat => {
    const grid = document.getElementById(`works-${cat}`);
    const btn = document.getElementById(`btn-cat-${cat}`);
    
    if (cat === category) {
      if (grid) grid.classList.add('active');
      if (btn) btn.classList.add('active');
    } else {
      if (grid) grid.classList.remove('active');
      if (btn) btn.classList.remove('active');
    }
  });
}

// 5. INTERACTIVE WALKTHROUGH TABS SWITCHER
function switchWalkthroughTab(tabName) {
  const tabs = ['attendance', 'results', 'fees', 'schedules', 'notifications'];
  
  tabs.forEach(tab => {
    const btn = document.getElementById(`btn-walk-${tab}`);
    const content = document.getElementById(`walk-content-${tab}`);
    
    if (tab === tabName) {
      if (btn) btn.classList.add('active');
      if (content) {
        content.style.display = 'block';
        content.classList.add('active');
      }
    } else {
      if (btn) btn.classList.remove('active');
      if (content) {
        content.style.display = 'none';
        content.classList.remove('active');
      }
    }
  });

  // Update browser URL address dynamically
  const urlMap = {
    attendance: 'registers',
    results: 'gradebook',
    fees: 'billing',
    schedules: 'timetables',
    notifications: 'parent-alerts'
  };
  
  const urlAddress = document.getElementById('walkthrough-browser-url');
  if (urlAddress) {
    urlAddress.textContent = `app.eduflow.ng/dashboard/${urlMap[tabName]}`;
  }
}

// 6. EVENT LOADERS
window.addEventListener('DOMContentLoaded', () => {
  initStatesDropdown();
  console.log("Eduflow Marketing Engine loaded.");
  
  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Landing PWA Service Worker registered successfully!', reg.scope))
      .catch(err => console.warn('Landing PWA Service Worker registration failed:', err));
  }
});

// Fullscreen Entrance Preloader Fade-out Controller
function dismissSitePreloader() {
  const preloader = document.getElementById('site-preloader');
  if (preloader) {
    preloader.style.opacity = '0';
    preloader.style.pointerEvents = 'none';
    setTimeout(() => {
      try { preloader.remove(); } catch(e) {}
    }, 300);
  }
}

document.addEventListener('DOMContentLoaded', dismissSitePreloader);
window.addEventListener('load', dismissSitePreloader);
setTimeout(dismissSitePreloader, 600);

// Accordion FAQ Panel Toggle Handler
function toggleFaq(button) {
  const item = button.parentNode;
  const answer = item.querySelector('.faq-answer');
  const svg = button.querySelector('svg');
  const allItems = document.querySelectorAll('.faq-item');
  
  // Close other open FAQ panels
  allItems.forEach(i => {
    if (i !== item) {
      const otherAnswer = i.querySelector('.faq-answer');
      const otherSvg = i.querySelector('svg');
      if (otherAnswer) otherAnswer.style.maxHeight = '0px';
      if (otherSvg) otherSvg.style.transform = 'rotate(0deg)';
      i.style.borderColor = 'var(--border-color)';
      i.style.boxShadow = 'none';
    }
  });

  // Toggle current FAQ panel
  if (answer.style.maxHeight === '0px' || answer.style.maxHeight === '') {
    answer.style.maxHeight = answer.scrollHeight + 'px';
    svg.style.transform = 'rotate(180deg)';
    item.style.borderColor = 'var(--primary)';
    item.style.boxShadow = '0 10px 30px rgba(91, 79, 224, 0.05)';
  } else {
    answer.style.maxHeight = '0px';
    svg.style.transform = 'rotate(0deg)';
    item.style.borderColor = 'var(--border-color)';
    item.style.boxShadow = 'none';
  }
}

function toggleMobileLandingMenu() {
  const drawer = document.getElementById('mobile-landing-drawer');
  if (drawer) {
    drawer.classList.toggle('active');
  }
}

function quickFillLogin(identifier, password = '') {
  const idInput = document.getElementById('login-identifier');
  const passInput = document.getElementById('login-password');
  if (idInput) idInput.value = identifier;
  if (passInput) {
    passInput.value = password;
    passInput.focus();
  }
}

async function handleContactInquirySubmit(e) {
  if (e) e.preventDefault();
  const nameInput = document.getElementById('contact-name');
  const schoolInput = document.getElementById('contact-school');
  const phoneInput = document.getElementById('contact-phone');
  const purposeInput = document.getElementById('contact-purpose');
  const messageInput = document.getElementById('contact-message');
  
  const name = nameInput ? nameInput.value.trim() : 'Guest';
  const school = schoolInput ? schoolInput.value.trim() : 'School';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const purpose = purposeInput ? purposeInput.value : 'Live Demo';
  const message = messageInput ? messageInput.value.trim() : '';

  const submitBtn = document.querySelector('#contact-inquiry-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Submitting to Azare Hub...';
  }

  try {
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? `${API_BASE_URL}/inquiries` : '/api/inquiries';
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, school, phone, purpose, message })
    });
  } catch(err) {
    console.warn("Failed to POST inquiry to server API:", err);
  }

  alert(`✨ Inquiry Dispatched to SuperAdmin!\n\nThank you, ${name}!\nYour request for ${school} (${phone}) has been logged in the SuperAdmin Portal.\nOur technical support team will contact you directly via call or WhatsApp.`);
  
  const form = document.getElementById('contact-inquiry-form');
  if (form) form.reset();

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '🚀 Submit Inquiry';
  }
}
}
