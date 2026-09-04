"""
Structure complete du questionnaire d'audit AFCsoft.

Genere a partir de questionnaire_AFCsoft.docx, puis nettoye.
Ceci est la SOURCE UNIQUE DE VERITE du questionnaire : pour ajouter,
modifier ou supprimer une question, editez directement cette structure
puis redemarrez le serveur.

Chaque noeud (section / etape / sous-etape / sous-sous-etape) a la forme :
{
    "id": "1.2.3",              # identifiant hierarchique (numerotation)
    "label": "Titre",           # titre affiche
    "questions": [ ... ],       # questions de ce niveau (peut etre vide)
    "children": [ ... ],        # sous-niveaux (sous-etapes), meme forme
}

Chaque question a la forme :
{
    "id": "A-1-1",              # code unique de la question
    "label": "Raison sociale",  # libelle affiche
    "type": "text",             # type de champ (voir ci-dessous)
    "options": [...],           # si type select / checkbox_list / collecte
    "columns": [...],           # si type table
    "withNA": True,             # si type radio_na
    "conditionalOn": {"questionId": "A-1-18", "value": "oui"},  # affichage conditionnel
    # conditionalOn peut aussi etre une LISTE de conditions (toutes doivent etre vraies)
}

Types de champ disponibles :
  text, textarea, number, date, radio, radio_na, select,
  table, checkbox_list, collecte, file

Pour AJOUTER une question : ajoutez un dict a la liste "questions" du bon
noeud, avec un "id" unique.
Pour MODIFIER : changez les champs du dict correspondant.
Pour SUPPRIMER : retirez le dict de la liste.
Pour REORDONNER : changez l'ordre dans la liste (l'ordre d'affichage suit
l'ordre de la liste Python).
"""

QUESTIONNAIRE = [{'id': '1',
  'label': 'Acceptation ou poursuite de la mission',
  'questions': [],
  'children': [{'id': '1.1',
                'label': 'Prise de connaissance',
                'questions': [],
                'children': [{'id': '1.1.1',
                              'label': "Éléments relatifs à la structure de l'entité",
                              'questions': [{'id': 'A-1-1', 'label': 'Raison sociale', 'type': 'text'},
                                            {'id': 'A-1-2',
                                             'label': 'Forme juridique',
                                             'type': 'select',
                                             'options': ['Société anonyme (SA)',
                                                         'Société à responsabilité limité (SARL)',
                                                         'Société par actions simplifiée (SAS)',
                                                         'Société par actions simplifiée unipersonnelle '
                                                         '(SASU)',
                                                         'Association',
                                                         'Ou saisir la forme juridique']},
                                            {'id': 'A-1-4',
                                             'label': 'Date de sa constitution',
                                             'type': 'date'},
                                            {'id': 'A-1-5', 'label': 'Durée de la société', 'type': 'text'},
                                            {'id': 'A-1-6', 'label': 'Capital social (FCFA)', 'type': 'text'},
                                            {'id': 'A-1-7',
                                             'label': 'Répartition',
                                             'type': 'table',
                                             'columns': ['Nombre de titres', 'Nominal', 'Capital (FCFA)']},
                                            {'id': 'A-1-8', 'label': 'Numéro RCCM', 'type': 'text'},
                                            {'id': 'A-1-9', 'label': 'Activité', 'type': 'text'},
                                            {'id': 'A-1-11', 'label': 'Adresse', 'type': 'text'},
                                            {'id': 'A-1-12', 'label': 'Boîte postale', 'type': 'text'},
                                            {'id': 'A-1-13', 'label': 'Ville', 'type': 'text'},
                                            {'id': 'A-1-14', 'label': 'Téléphone', 'type': 'text'},
                                            {'id': 'A-1-15', 'label': 'Site internet', 'type': 'text'},
                                            {'id': 'A-1-16',
                                             'label': 'Actionnariat',
                                             'type': 'table',
                                             'columns': ['Identité', 'Part', 'Droit de vote', 'Parts']},
                                            {'id': 'A-1-17',
                                             'label': "Organes de surveillance et d'administration",
                                             'type': 'table',
                                             'columns': ['Organes', 'Nom', 'Salarié de l’entité']},
                                            {'id': 'A-1-18',
                                             'label': 'Appartenance à un groupe',
                                             'type': 'radio'},
                                            {'id': 'A-1-19',
                                             'label': 'Dénomination du groupe',
                                             'type': 'textarea',
                                             'conditionalOn': {'questionId': 'A-1-18', 'value': 'oui'}},
                                            {'id': 'A-1-20',
                                             'label': 'Maison mère du groupe',
                                             'type': 'textarea',
                                             'conditionalOn': {'questionId': 'A-1-18', 'value': 'oui'}},
                                            {'id': 'A-1-21',
                                             'label': 'Filiale / mère',
                                             'type': 'table',
                                             'columns': ['Nom',
                                                         'Nationalité',
                                                         'Commissaire aux comptes',
                                                         '%Détention',
                                                         '%Contrôle']},
                                            {'id': 'A-1-22',
                                             'label': 'Informations relatives à la direction',
                                             'type': 'table',
                                             'columns': ['Nom',
                                                         'Fonction au sein de l’entreprise',
                                                         'Expérience professionnelle']},
                                            {'id': 'A-1-23',
                                             'label': 'Sensibilité de la direction au contrôle interne',
                                             'type': 'text'},
                                            {'id': 'A-1-24',
                                             'label': 'Particularités en matière de principes comptables et '
                                                      "d'information financière",
                                             'type': 'text'},
                                            {'id': 'A-1-25',
                                             'label': 'Information fiscale : importer le numéro '
                                                      "d'identification unique (NIU), la Déclaration "
                                                      'Statistique et Fiscale (DSF) et le dernier contrôle '
                                                      'fiscal',
                                             'type': 'file'}],
                              'children': []},
                             {'id': '1.1.2',
                              'label': 'Contacts',
                              'questions': [{'id': 'A-1-25',
                                             'label': "Contacts au sein de l'entité",
                                             'type': 'table',
                                             'columns': ['Nom', 'Fonction', 'Téléphone', 'Email']},
                                            {'id': 'A-1-26',
                                             'label': 'Présence d’un expert-comptable ?',
                                             'type': 'radio'},
                                            {'id': 'A-1-27',
                                             'label': 'Contacts de l’expert-comptable',
                                             'type': 'table',
                                             'columns': ['Nom',
                                                         'Fonction',
                                                         'Téléphone',
                                                         'Email',
                                                         'Nature de la mission']},
                                            {'id': 'A-1-28',
                                             'label': 'Autres contacts externes',
                                             'type': 'table',
                                             'columns': ['Nom',
                                                         'Fonction',
                                                         'Téléphone',
                                                         'Email',
                                                         'Nature de la mission']}],
                              'children': []}]},
               {'id': '1.2',
                'label': 'Respect des règles déontologiques',
                'questions': [],
                'children': [{'id': '1.2.1',
                              'label': 'Interdictions et incompatibilités',
                              'questions': [{'id': 'A-2-1',
                                             'label': "Des mesures ont-elles été prises pour s'assurer que "
                                                      'le commissaire aux comptes ne se trouve pas dans une '
                                                      "situation visée par les articles 697 à 700 de l'Acte "
                                                      'uniforme relatif au droit des sociétés commerciales '
                                                      'et du GIE ?',
                                             'type': 'radio'},
                                            {'id': 'A-2-2',
                                             'label': "Des mesures ont-elles été prises pour s'assurer que "
                                                      'le commissaire aux comptes ne se trouve pas dans une '
                                                      'situation visée par les articles 29 à 34 de la Loi N° '
                                                      "2011/009 du 06 mai 2011 relative à l'exercice de la "
                                                      'profession comptable libérale et au fonctionnement de '
                                                      "l'Ordre National des Experts-comptables du Cameroun "
                                                      '(ONECCA) ?',
                                             'type': 'radio'}],
                              'children': []},
                             {'id': '1.2.2',
                              'label': 'Indépendance',
                              'questions': [{'id': 'A-2-7',
                                             'label': 'Des mesures ont-elles été prises pour identifier des '
                                                      "risques de nature à affecter d'une quelconque façon "
                                                      "l'indépendance du commissaire aux comptes ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-2-8',
                                             'label': 'Le cas échéant, des mesures de sauvegarde ont-elles '
                                                      'été mises en œuvre ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-2-9',
                                             'label': "Des mesures ont-elles été prises pour s'assurer que "
                                                      "le commissaire aux comptes n'est pas dans une "
                                                      "position de risques d'auto révision dans le cadre "
                                                      "d'une succession de missions",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-2-10',
                                             'label': 'En cas de fourniture de prestations de services par '
                                                      'le réseau, une analyse a-t-elle été effectuée en '
                                                      'précisant pour chaque mission',
                                             'type': 'radio_na',
                                             'withNA': True,
                                             'conditionalOn': {'questionId': 'A-2-4', 'value': 'oui'}},
                                            {'id': 'A-2-11',
                                             'label': 'En cas de fourniture de prestations de service par le '
                                                      'réseau, la prestation fournie par le réseau fait elle '
                                                      'partie des prestations visées à l’article L 821-31 '
                                                      'alinéa 2 du code de commerce ou d’une prestation '
                                                      'générant un risque de perte d’indépendance du CAC '
                                                      'neccessitant l’application de mesures de sauvegarde',
                                             'type': 'radio_na',
                                             'withNA': True,
                                             'conditionalOn': {'questionId': 'A-2-4', 'value': 'oui'}},
                                            {'id': 'A-2-12',
                                             'label': "Le niveau d'honoraires est-il en adéquation avec "
                                                      "l'importance des diligences à accomplir ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-2-13',
                                             'label': 'La part des honoraires de la mission dans le total '
                                                      "des revenus professionnels ou du chiffre d'affaires "
                                                      'a-t-elle été vérifiée ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-2-14',
                                             'label': "Des mesures ont-elles été prises pour s'assurer que "
                                                      "l'auditeur est en conformité avec le Code d'éthique "
                                                      'des professionnels libéraux de la comptabilité et de '
                                                      "l'audit de l'OHADA ?",
                                             'type': 'radio'}],
                              'children': []}]},
               {'id': '1.3',
                'label': 'Respect des obligations LBFT',
                'questions': [],
                'children': [{'id': '1.3.1',
                              'label': 'Identification de l’entité et vérification des éléments '
                                       'd’identification de l’entité',
                              'questions': [{'id': 'A-3-1',
                                             'label': 'A-t-on collecté les informations sur',
                                             'type': 'collecte',
                                             'options': ['La forme juridique',
                                                         'La dénomination',
                                                         'Le numéro d’immatriculation',
                                                         'L’adresse du siège social',
                                                         'L’adresse du lieu de direction effective de '
                                                         'l’activité, si différent du siège social']}],
                              'children': []}]},
               {'id': '1.4',
                'label': "Analyse préliminaire de l'existence de risques",
                'questions': [],
                'children': [{'id': '1.4.1',
                              'label': 'Dirigeants (Attitude et éthique des dirigeants)',
                              'questions': [{'id': 'A-4-1',
                                             'label': 'Connaissez-vous le client, sa réputation via des '
                                                      'clients ou des confrères ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-2',
                                             'label': "Peut-on avoir un doute sur l'intégrité des dirigeants "
                                                      'au regard de condamnations, de sanctions '
                                                      'réglementaires, de relations avec des personnes '
                                                      'morales ou physique aux principes moraux douteux, de '
                                                      'non respect de réglementation professionnelle… ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-3',
                                             'label': 'A-t-on connaissance de commissaires aux comptes ou de '
                                                      'professionnels qui auraient refusé de travailler avec '
                                                      'ce client ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-4',
                                             'label': 'Existe-t-il une situation conflictuelle entre les '
                                                      'dirigeants ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.4.2',
                              'label': 'Actionnariat',
                              'questions': [{'id': 'A-4-5',
                                             'label': 'Existe-t-il un risque sur la structure de '
                                                      'l’actionnariat ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-6',
                                             'label': 'A-t-on connaissance de conflits entre les '
                                                      'actionnaires ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.4.3',
                              'label': 'Personnel',
                              'questions': [{'id': 'A-4-7',
                                             'label': 'La compétence du personnel semble-t-elle '
                                                      'satisfaisante ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-8',
                                             'label': 'La rotation du personnel est-elle fréquente ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.4.4',
                              'label': 'Activité et environnement réglementaire',
                              'questions': [{'id': 'A-4-9',
                                             'label': 'A-t-on connaissance de risques économiques (secteur '
                                                      'd’activité sensible, activités spéculatives …) ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-10',
                                             'label': 'A-t-on connaissance de risques fiscaux ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-11',
                                             'label': 'A-t-on connaissance de risques sociaux ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-12',
                                             'label': 'A-t-on connaissance de risques juridiques ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.4.5',
                              'label': 'Contrôle interne',
                              'questions': [{'id': 'A-4-13',
                                             'label': 'Existe-t-il une politique des dirigeants en matière '
                                                      'de contrôle interne ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-14',
                                             'label': 'A-t-on connaissance d’une insuffisance du contrôle '
                                                      'interne ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.4.6',
                              'label': "Situation financière de l'entité",
                              'questions': [{'id': 'A-4-15',
                                             'label': 'La structure financière semble-t-elle équilibrée ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-16',
                                             'label': 'La continuité d’exploitation semble-t-elle compromise '
                                                      '?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.4.7',
                              'label': 'Information financière',
                              'questions': [{'id': 'A-4-17',
                                             'label': 'A-t-on connaissance d’une insuffisance dans la tenue '
                                                      'de comptabilité ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-18',
                                             'label': 'A-t-on connaissance de retard dans l’établissement '
                                                      'des comptes annuels ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.4.8',
                              'label': 'Mission du commissaire aux comptes',
                              'questions': [{'id': 'A-4-19',
                                             'label': 'A-t-on connaissance de limitation dans les contrôles '
                                                      '?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'A-4-20',
                                             'label': 'Existe-t-il d’autres obstacles à l’exécution de la '
                                                      'mission ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []}]},
               {'id': '1.5',
                'label': 'Analyse des critères CAC',
                'questions': [],
                'children': [{'id': '1.5.1',
                              'label': 'Critères propres au commissaire aux comptes',
                              'questions': [],
                              'children': [{'id': '1.5.1.1',
                                            'label': 'Barème',
                                            'questions': [{'id': 'A-5-1',
                                                           'label': 'Total bilan (FCFA)',
                                                           'type': 'text'},
                                                          {'id': 'A-5-2',
                                                           'label': 'Produits d’exploitation (FCFA)',
                                                           'type': 'text'},
                                                          {'id': 'A-5-3',
                                                           'label': 'Produits financiers (FCFA)',
                                                           'type': 'text'},
                                                          {'id': 'A-5-4',
                                                           'label': 'Une demande de dérogation est-elle '
                                                                    'nécessaire ?',
                                                           'type': 'radio'}],
                                            'children': []},
                                           {'id': '1.5.1.2',
                                            'label': 'Compétences',
                                            'questions': [{'id': 'A-5-5',
                                                           'label': 'Le dossier requiert-il des compétences '
                                                                    'particulières ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'A-5-6',
                                                           'label': 'Si oui, quelles sont elles ?',
                                                           'type': 'textarea'},
                                                          {'id': 'A-5-7',
                                                           'label': 'Le niveau de compétences est-il adapté '
                                                                    'pour',
                                                           'type': 'collecte',
                                                           'options': ['Le commissaire aux comptes',
                                                                       'Les membres de l’équipe']}],
                                            'children': []},
                                           {'id': '1.5.1.3',
                                            'label': 'Moyens en ressources humaines',
                                            'questions': [{'id': 'A-5-8',
                                                           'label': 'Les éléments établissant que les '
                                                                    'ressources humaines et matérielles '
                                                                    'nécessaires à la bonne exécution de la '
                                                                    'mission ont-ils été vérifiés et '
                                                                    'consignés dans le dossier ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '1.5.1.4',
                                            'label': 'Planning',
                                            'questions': [{'id': 'A-5-9',
                                                           'label': 'Le dossier requiert-il des impératifs '
                                                                    "en termes de planning d'intervention ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'A-5-10',
                                                           'label': 'Si oui, quelles sont elles ?',
                                                           'type': 'textarea',
                                                           'conditionalOn': {'questionId': 'A-5-9',
                                                                             'value': 'oui'}},
                                                          {'id': 'A-5-11',
                                                           'label': 'Peuvent ils être respectés ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'A-5-9',
                                                                             'value': 'oui'}},
                                                          {'id': 'A-5-12',
                                                           'label': "Est-ce le premier exercice d'un nouveau "
                                                                    'mandat ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'A-5-13',
                                                           'label': 'Les comptes précédents ont-ils fait '
                                                                    'l’objet d’un audit par un commissaire '
                                                                    'aux comptes ?',
                                                           'type': 'radio'}],
                                            'children': []}]}]},
               {'id': '1.6',
                'label': 'Acceptation et lettre de mission',
                'questions': [],
                'children': [{'id': '1.6.1',
                              'label': "Décision d'acceptation",
                              'questions': [{'id': 'A-6-2', 'label': 'Date de nomination', 'type': 'date'},
                                            {'id': 'A-6-3',
                                             'label': 'Date de fin de mandat (exercice clos)',
                                             'type': 'date'},
                                            {'id': 'A-6-4',
                                             'label': 'Associé mandataire social',
                                             'type': 'text'},
                                            {'id': 'A-6-5',
                                             'label': 'Associé responsable technique',
                                             'type': 'text'},
                                            {'id': 'A-6-6', 'label': "Membres de l'équipe", 'type': 'text'},
                                            {'id': 'A-6-7',
                                             'label': 'Entité en dessous des seuils de nomination du '
                                                      'commissaire aux comptes',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.6.2',
                              'label': "Nomination du commissaire aux comptes par l'assemblée générale",
                              'questions': [{'id': 'A-6-8',
                                             'label': 'La nomination du cabinet comme commissaire aux '
                                                      'comptes a-t-elle été régulièrement effectuée par '
                                                      "l'assemblée générale ? Si oui, joindre le "
                                                      "procès-verbal de l'assemblée générale",
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.6.3',
                              'label': 'Inscription du nom du commissaire aux comptes au RCCM',
                              'questions': [{'id': 'A-6-9',
                                             'label': 'La nomination du cabinet comme commissaire aux '
                                                      'comptes a-t-elle été régulièrement inscrite au '
                                                      'Registre du Commerce et du Crédit Mobilier de la '
                                                      "société ? Si oui, joindre l'extrait du RCCM",
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '1.6.4',
                              'label': 'Lettre de mission',
                              'questions': [{'id': 'A-6-10',
                                             'label': "Joindre la lettre de mission acceptée par l'entité "
                                                      'auditée',
                                             'type': 'file'}],
                              'children': []}]}]},
 {'id': '2',
  'label': 'Planification',
  'questions': [],
  'children': [{'id': '2.1',
                'label': "Entretien initial et liste général pour l'audit",
                'questions': [],
                'children': [{'id': '2.1.1',
                              'label': 'Entretien initial avec la direction',
                              'questions': [{'id': 'B-1-1',
                                             'label': 'Modèle de question à remplir',
                                             'type': 'textarea'}],
                              'children': []},
                             {'id': '2.1.2',
                              'label': "Informations générales d'audit",
                              'questions': [{'id': 'B-1-2',
                                             'label': 'Envoyer la liste des informations nécessaires pour '
                                                      "l'audit",
                                             'type': 'file'}],
                              'children': []}]},
               {'id': '2.2',
                'label': 'Procédure analytique',
                'questions': [],
                'children': [{'id': '2.2.1',
                              'label': 'Balance générale',
                              'questions': [{'id': 'B-2-1',
                                             'label': 'Attacher les pièces jointes suivantes : balance '
                                                      'générale N, balance générale N-1',
                                             'type': 'file'}],
                              'children': []},
                             {'id': '2.2.2',
                              'label': 'Procédure analytique préliminaire',
                              'questions': [{'id': 'B-2-2',
                                             'label': 'Commenter la procédure et attacher les pièces jointes',
                                             'type': 'textarea'}],
                              'children': []}]},
               {'id': '2.3',
                'label': 'Identification & Évaluation des risques diffus',
                'questions': [],
                'children': [{'id': '2.3.1',
                              'label': 'Activité',
                              'questions': [],
                              'children': [{'id': '2.3.1.1',
                                            'label': 'Activité, marché et concurrence',
                                            'questions': [{'id': 'B-3-1-1',
                                                           'label': 'Indiquer',
                                                           'type': 'textarea'},
                                                          {'id': 'B-3-1-2',
                                                           'label': 'L’évolution du marché dans lequel se '
                                                                    'situe l’entité est-elle favorable ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-3',
                                                           'label': 'Existe-t-il un risque lié à une vive '
                                                                    'concurrence ou à un marché entraînant '
                                                                    'une chute des marges commerciales ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-4',
                                                           'label': "L'activité de l'entité est-elle liée "
                                                                    'aux problématiques de saisonnalité, de '
                                                                    'frais de recherche et développement, de '
                                                                    'cycles de production à long terme, de '
                                                                    'sous activité ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-5',
                                                           'label': "L’activité de l'entité est-elle liée "
                                                                    'aux innovations ou changements '
                                                                    'technologiques ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-6',
                                                           'label': 'Peut-on considérer que l’existence de '
                                                                    "changement dans le secteur d'activité "
                                                                    'entraîne vulnérabilité ou obsolescence '
                                                                    '?',
                                                           'type': 'textarea'},
                                                          {'id': 'B-3-1-7',
                                                           'label': 'Indiquer',
                                                           'type': 'table',
                                                           'columns': ['Secteur d’activité',
                                                                       'Principaux clients',
                                                                       'Principaux fournisseurs',
                                                                       'Autres éléments d’information']},
                                                          {'id': 'B-3-1-8',
                                                           'label': "L'entité est-elle indépendante par "
                                                                    'rapport à ses fournisseurs ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-9',
                                                           'label': "L'entité est-elle indépendante par "
                                                                    'rapport à ses clients ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-10',
                                                           'label': 'Les approvisionnements et les débouchés '
                                                                    "de l'entité sont-ils stables (absence "
                                                                    "de perte d'un client ou d'un "
                                                                    'fournisseur important) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-11',
                                                           'label': 'Le ratio de crédit clients est-il '
                                                                    'normal en regard de l’activité ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-12',
                                                           'label': 'Les délais de paiement des fournisseurs '
                                                                    '(ratio crédit fournisseurs) sont-ils '
                                                                    'normaux ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-14',
                                                           'label': "L'entité est-elle liée par des "
                                                                    'prévisions irréalistes vis-à-vis des '
                                                                    'tiers ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-15',
                                                           'label': "L'entité est-elle liée par des "
                                                                    'engagements financiers auprès de '
                                                                    'partenaires (dividendes prioritaires, '
                                                                    "covenants bancaires, pacte d'associés, "
                                                                    'etc.) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-16',
                                                           'label': 'Indiquer',
                                                           'type': 'table',
                                                           'columns': ['Nature des projets',
                                                                       'Éléments clés',
                                                                       'Partenaires financiers',
                                                                       'Observations']},
                                                          {'id': 'B-3-1-17',
                                                           'label': 'La direction cherche-t-elle à limiter '
                                                                    'les risques dans la prise de décision '
                                                                    'sur des points majeurs (investissement, '
                                                                    'financement, politique commerciale) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-18',
                                                           'label': 'Les nouvelles activités et/ou les '
                                                                    'objectifs de croissance externe '
                                                                    'font-ils apparaître un risque pour '
                                                                    "l'entité ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-19',
                                                           'label': "Dans la perspective d'une cession, la "
                                                                    "valeur de l'entité et son résultat "
                                                                    'sont-ils établis sans manipulation de '
                                                                    'la direction ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-20',
                                                           'label': 'Y-a-t-il un risque de manipulation de '
                                                                    'la part de la direction ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.1.2',
                                            'label': "Continuité d'exploitation",
                                            'questions': [{'id': 'B-3-1-21',
                                                           'label': 'Des évènements ou circonstances '
                                                                    'susceptibles de mettre en cause la '
                                                                    "continuité d'exploitation ont-ils été "
                                                                    "relevés (évolution de l'activité, "
                                                                    'relations bancaires, départs de '
                                                                    'salariés …) notamment lors de '
                                                                    "l'exercice précédent ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-22',
                                                           'label': 'Si oui, l’évaluation faite par la '
                                                                    'direction de l’entité de sa capacité, à '
                                                                    'pousuivre son exploitation est elle '
                                                                    'pertinente ( actions envisagés, '
                                                                    'hypothèses retenues…) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-23',
                                                           'label': 'Les comptes doivent-ils être établies '
                                                                    'en valeurs liquidative (continuité '
                                                                    'définitivement compromise ) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-24',
                                                           'label': 'Le déclenchement de la procédure '
                                                                    'd’alerte doit ils être envisagé ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-1-25',
                                                           'label': 'Préciser si les risques diffus '
                                                                    'éventuellement relevés concernent un ou '
                                                                    'plusieurs cycles',
                                                           'type': 'table',
                                                           'columns': ['Cycle',
                                                                       'Commentaire sur les comptes '
                                                                       'impactés']}],
                                            'children': []}]},
                             {'id': '2.3.2',
                              'label': 'Environnement réglementaire',
                              'questions': [],
                              'children': [{'id': '2.3.2.1',
                                            'label': 'Informations relatives au non-respect des textes '
                                                     'législatifs et réglementaires',
                                            'questions': [{'id': 'B-3-2-1',
                                                           'label': 'Indiquer',
                                                           'type': 'table',
                                                           'columns': ['Reference',
                                                                       'Textes législatifs &',
                                                                       'Autorités administratives et',
                                                                       'Observations']},
                                                          {'id': 'B-3-2-2',
                                                           'label': "Existe-t-il un risque d'anomalies "
                                                                    'significatives dans les comptes '
                                                                    'résultant du non-respect éventuel de '
                                                                    'textes légaux et réglementaires ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-2-3',
                                                           'label': 'Des cas de non-respect de textes légaux '
                                                                    'et réglementaires, dont le non-respect '
                                                                    'peut avoir des conséquences financières '
                                                                    "pour l'entité, ont-ils déjà été relevés "
                                                                    'sur les exercices précédents ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-2-4',
                                                           'label': 'Y-a-t-il une opération juridique '
                                                                    'en-cours susceptibles de conduire à des '
                                                                    'anomalies significatives dans les '
                                                                    'comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-2-5',
                                                           'label': 'Les correspondances reçues des '
                                                                    'autorités administratives et de '
                                                                    'contrôles font-elles état de cas de '
                                                                    'non-respect des textes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.2.2',
                                            'label': 'Conséquences sur les cycles',
                                            'questions': [{'id': 'B-3-2-6',
                                                           'label': 'Préciser si les risques diffus '
                                                                    'éventuellement relevés concernent un ou '
                                                                    'plusieurs cycles',
                                                           'type': 'table',
                                                           'columns': ['Cycle',
                                                                       'Commentaire sur les comptes '
                                                                       'impactés']}],
                                            'children': []}]},
                             {'id': '2.3.3',
                              'label': 'Informations sur les comptes',
                              'questions': [],
                              'children': [{'id': '2.3.3.1',
                                            'label': 'Établissement des comptes',
                                            'questions': [{'id': 'B-3-3-1',
                                                           'label': 'Les contrôles précédents ont-ils fait '
                                                                    "apparaître peu d'anomalie dans "
                                                                    "l'information comptable et financière ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-2',
                                                           'label': 'La nature des opérations réalisées par '
                                                                    "l'entité génère-t-elle des écritures "
                                                                    'comptables simples ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-3',
                                                           'label': 'La comptabilité est-elle tenue à jour '
                                                                    'et organisée ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-4',
                                                           'label': 'Existence d’estimation comptable ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-9',
                                                           'label': 'Indiquer',
                                                           'type': 'table',
                                                           'columns': ['Nature de financemlent',
                                                                       'Nature des besoins en',
                                                                       'Partenaires financiers',
                                                                       'Observations']},
                                                          {'id': 'B-3-3-10',
                                                           'label': "Les relations de l'entité avec ses "
                                                                    'banques sont-elles satisfaisantes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-11',
                                                           'label': 'Les engagements financiers sont-ils '
                                                                    'maîtrisés ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-12',
                                                           'label': 'A-t-elle des accords écrits pour les '
                                                                    'concours bancaires qu’elle utilise ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-13',
                                                           'label': "L'entité dispose-t-elle de concours "
                                                                    'bancaires à court terme suffisants '
                                                                    '(découvert, etc.) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.3.2',
                                            'label': 'Relations avec les parties liées',
                                            'questions': [{'id': 'B-3-3-14',
                                                           'label': 'Existence de parties liées ?',
                                                           'type': 'radio'},
                                                          {'id': 'B-3-3-15',
                                                           'label': 'Indiquer',
                                                           'type': 'textarea'},
                                                          {'id': 'B-3-3-16',
                                                           'label': 'Les informtions obtenues ont-elles '
                                                                    'conduites à identifier',
                                                           'type': 'collecte',
                                                           'options': ['Des risques d’anomalies '
                                                                       'significatives résultants des '
                                                                       'relations et des transactions avec '
                                                                       'des parties liées ?',
                                                                       'Des risques se rapportant à un '
                                                                       'risque inhérents élevé et '
                                                                       'nécessitant une démarche d’audit '
                                                                       'particulière',
                                                                       'Des facteurs de risques de fraude '
                                                                       'résultant de l’existence de parties '
                                                                       'liées ?']},
                                                          {'id': 'B-3-3-17',
                                                           'label': 'L’entité a-t-elle mis en place des '
                                                                    'contrôles sur les transactions avec les '
                                                                    'parties liées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-18',
                                                           'label': 'Les éventuelles opérations de '
                                                                    'restructurations / réorganisation en '
                                                                    'cours ou prévues sont elles '
                                                                    'susceptibles de conduire à des '
                                                                    'anomalies significatives des comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-19',
                                                           'label': 'En cas de détention par une entité '
                                                                    'mère, a-t-on pris en considération les '
                                                                    'engagements ayant une influence sur '
                                                                    'l’entité auditée ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-3-20',
                                                           'label': 'Préciser si les risques diffus '
                                                                    'éventuellement relevés concernent un ou '
                                                                    'plusieurs cycles',
                                                           'type': 'table',
                                                           'columns': ['Cycle',
                                                                       'Commentaire sur les comptes '
                                                                       'impactés']}],
                                            'children': []}]},
                             {'id': '2.3.4',
                              'label': 'Contrôle interne',
                              'questions': [],
                              'children': [{'id': '2.3.4.1',
                                            'label': 'Environnement de contrôle',
                                            'questions': [{'id': 'B-3-4-1',
                                                           'label': 'La direction manifeste-t-elle un '
                                                                    'intérêt pour la qualité du contrôle '
                                                                    'interne ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-2',
                                                           'label': 'La séparation des tâches au sein de '
                                                                    "l'entité est-elle suffisante ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-3',
                                                           'label': "Existe-t-il un processus d'autorisation "
                                                                    "préalable et d'approbation des "
                                                                    'opérations ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-4',
                                                           'label': "Le dirigeant de l'entité est-il "
                                                                    'directement impliqué dans le processus '
                                                                    "d'autorisation et de contrôle des "
                                                                    'opérations ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-5',
                                                           'label': 'La direction est-elle attentive à nos '
                                                                    'travaux ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-6',
                                                           'label': 'Les relations avec la direction '
                                                                    'sont-elles satisfaisantes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-7',
                                                           'label': 'La direction a-t-elle les connaissances '
                                                                    'appropriées et une bonne expérience '
                                                                    'pour un établissement correct des '
                                                                    'comptes de l’entité ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-8',
                                                           'label': "Le dirigeant s'implique-t-il dans "
                                                                    "l'activité de l'entité ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-9',
                                                           'label': 'La direction a-t-elle accordé une '
                                                                    'attention suffisante à nos '
                                                                    'recommandations ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-10',
                                                           'label': "Le dirigeant de l'entité dispose-t-il "
                                                                    "d'outils de pilotage fiables tels que "
                                                                    'des tableaux de bord assortis '
                                                                    "d'indicateurs pertinents ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-11',
                                                           'label': 'Existe-t-il des conflits entre les '
                                                                    'associés ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.4.2',
                                            'label': "Processus d'évaluation des risques par l'entité",
                                            'questions': [{'id': 'B-3-4-12',
                                                           'label': "L'entité a-t-elle mis en place des "
                                                                    'moyens pour identifier les risques liés '
                                                                    'à son activité, définit les actions et '
                                                                    'mis en place les procédures de contrôle '
                                                                    'interne nécessaires pour y répondre ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-13',
                                                           'label': "L'organisation de l'entreprise "
                                                                    'répond-t-elle aux exigences en matière '
                                                                    "fiscale relatives à la piste d'audit "
                                                                    'des ventes et des achats ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.4.3',
                                            'label': 'Suivi du bon fonctionnement du contrôle interne',
                                            'questions': [{'id': 'B-3-4-14',
                                                           'label': "La direction s'assure-t-elle du bon "
                                                                    'fonctionnement du contrôle interne ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-15',
                                                           'label': 'Prend-elle les mesures correctives '
                                                                    'nécessaires, le cas échéant ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.4.4',
                                            'label': "Système d'information et communication",
                                            'questions': [{'id': 'B-3-4-17',
                                                           'label': 'Le pilotage de la fonction informatique '
                                                                    'par la gouvernance est-elle suffisante '
                                                                    '?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-18',
                                                           'label': 'L’entité fait-elle appel à des '
                                                                    'prestataires externes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-19',
                                                           'label': 'La dépendance à des prestataires '
                                                                    'externes est elle maitrisée ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'B-3-4-18',
                                                                             'value': 'oui'}},
                                                          {'id': 'B-3-4-20',
                                                           'label': 'La fonction informatique est-elle en '
                                                                    'adéquation avec l’activité et la '
                                                                    'stratégie de l’entité ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-21',
                                                           'label': 'Les risques informatiques sont-ils '
                                                                    'suffisamment identifiés et maîtrisés '
                                                                    'par l’entité ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-23',
                                                           'label': 'D es évolutions du systèmes '
                                                                    'd’informations sont elles prévues ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-4-25',
                                                           'label': 'Lister les applications en lien avec la '
                                                                    'production de l’information financière '
                                                                    'utilisées dans l’entité',
                                                           'type': 'text'},
                                                          {'id': 'B-3-4-26',
                                                           'label': 'Le recours à un auditeur spécialisé '
                                                                    'dans les systèmes informatiques est-il '
                                                                    'nécessaire ?',
                                                           'type': 'radio'},
                                                          {'id': 'B-3-4-27',
                                                           'label': 'L’auditeur spécialisé est il membre de '
                                                                    'l’équipe d’audit ?',
                                                           'type': 'radio',
                                                           'conditionalOn': {'questionId': 'B-3-4-26',
                                                                             'value': 'oui'}},
                                                          {'id': 'B-3-4-30',
                                                           'label': 'A-t-on prévu, concernant le système '
                                                                    'd’information, de s’appuyer sur les '
                                                                    'contrôles de l’entité dans le cadre de '
                                                                    'l’audit ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.4.5',
                                            'label': "Appréciation du comportement et de l'éthique du "
                                                     'dirigeant',
                                            'questions': [{'id': 'B-3-4-34',
                                                           'label': "La gouvernance de l'entité est-elle "
                                                                    'assurée directement par le propriétaire '
                                                                    'dirigeant ?',
                                                           'type': 'text'}],
                                            'children': []}]},
                             {'id': '2.3.5',
                              'label': 'Fraude',
                              'questions': [],
                              'children': [{'id': '2.3.5.1',
                                            'label': 'Facteurs de risque de fraude',
                                            'questions': [{'id': 'B-3-5-1',
                                                           'label': 'Existe-t-il des circonstances '
                                                                    '(difficultés du secteur, insuffisance '
                                                                    'de fonds propres, recherche de nouveaux '
                                                                    'financements, etc.) susceptibles de '
                                                                    'conduire la direction à subir des '
                                                                    'pressions pouvant se traduire sur la '
                                                                    'présentation des comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-5-2',
                                                           'label': 'Le mode de rémunération de la direction '
                                                                    'est-il basé sur les résultats de '
                                                                    "l'entité ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-5-3',
                                                           'label': 'Y-a-t-il un projet de cession de '
                                                                    "l'entité envisagé ou en-cours ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-5-4',
                                                           'label': "Des manipulations importantes d'espèces "
                                                                    'ont-elles été constatées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.5.2',
                                            'label': 'Identification du risque d’anomalies significatives '
                                                     'résultant de fraude',
                                            'questions': [{'id': 'B-3-5-5',
                                                           'label': "La direction estime-t-elle qu'il existe "
                                                                    'un risque de fraude dans son entité ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-5-6',
                                                           'label': 'A-t-elle mis en place des procédures '
                                                                    'pour identifier les risques de fraudes '
                                                                    'et pour y répondre ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-5-7',
                                                           'label': "Le suivi des actifs susceptibles d'être "
                                                                    'détournés est-il suffisant ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'B-3-5-8',
                                                           'label': 'La direction a-t-elle connaissance de '
                                                                    'fraudes avérées, suspectées ou '
                                                                    'simplement alléguées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '2.3.5.3',
                                            'label': 'Conséquences sur les cycles',
                                            'questions': [{'id': 'B-3-5-10',
                                                           'label': 'Préciser si les risques diffus '
                                                                    'éventuellement relevés concernent un ou '
                                                                    'plusieurs cycles',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '2.3.6',
                              'label': 'Risques significatifs',
                              'questions': [{'id': 'B-3-6-1',
                                             'label': 'Existe-t-il des comptes présentant un risque '
                                                      'significatif ?',
                                             'type': 'radio'},
                                            {'id': 'B-3-6-2',
                                             'label': 'Indiquer ces comptes',
                                             'type': 'table',
                                             'columns': ['Cycle', 'Compte présentant un risque significatif'],
                                             'conditionalOn': {'questionId': 'B-3-6-1', 'value': 'oui'}}],
                              'children': []},
                             {'id': '2.3.7',
                              'label': "Points d'attention",
                              'questions': [],
                              'children': [{'id': '2.3.7.1',
                                            'label': "Principaux évènements de l'exercice",
                                            'questions': [{'id': 'B-3-7-1',
                                                           'label': 'Indiquer les principaux évènements',
                                                           'type': 'text'}],
                                            'children': []},
                                           {'id': '2.3.7.2',
                                            'label': "Prise en compte des points d'attention relevés lors de "
                                                     "l'exercice précédent (en N-1)",
                                            'questions': [{'id': 'B-3-7-2',
                                                           'label': 'Points de l’exercice précédent',
                                                           'type': 'text'}],
                                            'children': []},
                                           {'id': '2.3.7.3',
                                            'label': 'Conséquences sur les cycles',
                                            'questions': [{'id': 'B-3-7-3',
                                                           'label': 'Préciser si les risques diffus '
                                                                    'éventuellement relevés concernent un ou '
                                                                    'plusieurs cycles',
                                                           'type': 'table',
                                                           'columns': ['Cycle',
                                                                       'Commentaire sur les comptes '
                                                                       'impactés']}],
                                            'children': []}]}]},
               {'id': '2.4',
                'label': 'Seuils de signification et planification',
                'questions': [],
                'children': [{'id': '2.4.1',
                              'label': 'Identification des critères pertinents pour la détermination du(des) '
                                       'seuil(s)',
                              'questions': [{'id': 'B-4-1',
                                             'label': "Facteurs susceptibles d'influencer le choix des "
                                                      'critères',
                                             'type': 'table',
                                             'columns': ['Influence sur le choix des critères',
                                                         'Commentaire']},
                                            {'id': 'B-4-2',
                                             'label': 'Autres types de facteurs, le cas échéant',
                                             'type': 'table',
                                             'columns': ['Type de facteur',
                                                         'Influence sur le choix de critère',
                                                         'Commentaires']},
                                            {'id': 'B-4-3',
                                             'label': 'Sélectionner le critère pertinent',
                                             'type': 'text'},
                                            {'id': 'B-4-5',
                                             'label': 'Critère pertinent',
                                             'type': 'table',
                                             'columns': ['Critère pertinent',
                                                         'Taux indicatif',
                                                         'Base(FCFA)',
                                                         'Taux retenu en pourcen',
                                                         'Montant']}],
                              'children': []},
                             {'id': '2.4.2',
                              'label': 'Seuils',
                              'questions': [{'id': 'B-4-6',
                                             'label': 'Indiquer les seuils retenus',
                                             'type': 'table',
                                             'columns': ['N', 'N-1']},
                                            {'id': 'B-4-7',
                                             'label': 'Expliquer les pourcentages retenus pour la '
                                                      'détermination du seuil de planification et le seuil '
                                                      'd’anomalies manifestement insignifiantes',
                                             'type': 'text'}],
                              'children': []},
                             {'id': '2.4.3',
                              'label': 'Identification des seuils de significations de montants inférieurs '
                                       '(NEP 320.15-16 et 320.21), le cas échéant',
                              'questions': [{'id': 'B-4-8',
                                             'label': 'Des seuils de signification de montants inférieurs '
                                                      'doivent-ils être retenus ?',
                                             'type': 'radio'}],
                              'children': []}]},
               {'id': '2.5',
                'label': 'Identification des cycles significatifs',
                'questions': [],
                'children': [{'id': '2.5.1',
                              'label': 'Synthèse des cycles significatifs',
                              'questions': [{'id': 'B-5-1',
                                             'label': 'Indiquer les cycles significatifs',
                                             'type': 'table',
                                             'columns': ['Significatif', 'Commentaire']}],
                              'children': []}]},
               {'id': '2.6',
                'label': 'Matrice',
                'questions': [],
                'children': [{'id': '2.6.1',
                              'label': 'Trésorerie / Financement',
                              'questions': [],
                              'children': [{'id': '2.6.1.1',
                                            'label': 'Risques inhérents',
                                            'questions': [],
                                            'children': []},
                                           {'id': '2.6.1.2',
                                            'label': 'Contrôle interne',
                                            'questions': [],
                                            'children': []},
                                           {'id': '2.6.1.3',
                                            'label': 'Evaluation du risque d’anomalies significatives (RAS)',
                                            'questions': [],
                                            'children': []},
                                           {'id': '2.6.1.4',
                                            'label': "Travaux de l'expert-comptable",
                                            'questions': [],
                                            'children': []},
                                           {'id': '2.6.1.5',
                                            'label': 'Contrôle de substance',
                                            'questions': [],
                                            'children': []}]},
                             {'id': '2.6.2',
                              'label': "Synthèse des risques d'anomalies",
                              'questions': [],
                              'children': []}]}]},
 {'id': '3',
  'label': "Réalisation des procédures d'audit",
  'questions': [],
  'children': [{'id': '3.1',
                'label': 'Contrôle de substance',
                'questions': [],
                'children': [{'id': '3.1.1',
                              'label': 'Trésorerie / Financement',
                              'questions': [],
                              'children': [{'id': '3.1.1.1',
                                            'label': "Travaux de l'expert-comptable",
                                            'questions': [],
                                            'children': []},
                                           {'id': '3.1.1.2',
                                            'label': 'Réalisation des contrôles de substance',
                                            'questions': [],
                                            'children': []},
                                           {'id': '3.1.1.3',
                                            'label': 'Point en suspens',
                                            'questions': [],
                                            'children': []},
                                           {'id': '3.1.1.4',
                                            'label': 'Anomalies',
                                            'questions': [],
                                            'children': []}]},
                             {'id': '3.1.2',
                              'label': 'Achats / Fournisseurs',
                              'questions': [],
                              'children': []},
                             {'id': '3.1.3', 'label': 'Clients / Ventes', 'questions': [], 'children': []},
                             {'id': '3.1.4', 'label': 'Stocks', 'questions': [], 'children': []},
                             {'id': '3.1.5', 'label': 'Immobilisations', 'questions': [], 'children': []},
                             {'id': '3.1.6', 'label': 'Personnel', 'questions': [], 'children': []},
                             {'id': '3.1.7', 'label': 'État', 'questions': [], 'children': []},
                             {'id': '3.1.8', 'label': 'Capitaux propres', 'questions': [], 'children': []},
                             {'id': '3.1.9',
                              'label': 'Provisions pour risques et charges',
                              'questions': [],
                              'children': []},
                             {'id': '3.1.10',
                              'label': 'Débiteurs et créditeurs divers',
                              'questions': [],
                              'children': []},
                             {'id': '3.1.11',
                              'label': 'Charges et produits exceptionnels',
                              'questions': [],
                              'children': []}]},
               {'id': '3.2',
                'label': "Contrôles des ajustements et des écritures d'inventaire",
                'questions': [],
                'children': [{'id': '3.2.1',
                              'label': 'Contrôle du risque de fraudes au niveau de l’arrêté des comptes',
                              'questions': [{'id': 'C-2-1',
                                             'label': 'A-t-on relevé des opérations importantes qui semblent '
                                                      'être en dehors des activités ordinaires de l’entité '
                                                      'ou inhabituelles ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-2',
                                             'label': 'Comprendre la justification économique des opérations '
                                                      'importantes qui semblent être en dehors des activités '
                                                      'ordinaires de l’entité ou inhabituelles',
                                             'type': 'text',
                                             'conditionalOn': {'questionId': 'C-2-1', 'value': 'oui'}},
                                            {'id': 'C-2-3',
                                             'label': 'Y-a-t-il des points en suspens ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-4',
                                             'label': 'Points en suspens réponses obtenus',
                                             'type': 'textarea'},
                                            {'id': 'C-2-5',
                                             'label': 'A-t-on décelé des anomalies ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-6',
                                             'label': 'Cela s’affiche que si on choisi oui à la question '
                                                      'C-2-5',
                                             'type': 'table',
                                             'columns': ['Type',
                                                         'Montant (fcfa)',
                                                         'Description',
                                                         'Anomalie corrigée']},
                                            {'id': 'C-2-7',
                                             'label': 'Dépend de C-2-6, s’affiche si oui à été cliqué au '
                                                      'moins 1 fois sur anomalie corrigé',
                                             'type': 'textarea'},
                                            {'id': 'C-2-8', 'label': 'Conclusion', 'type': 'textarea'},
                                            {'id': 'C-2-9',
                                             'label': 'Ce point est-il à suivre sur N+1 ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-10',
                                             'label': 'Préciser les éméments',
                                             'type': 'text',
                                             'conditionalOn': {'questionId': 'C-2-9', 'value': 'oui'}}],
                              'children': []},
                             {'id': '3.2.2',
                              'label': 'Contrôle relatif à l’obligation de vigilance relative à la lutte '
                                       'contre le blanchiment de capitaux et de financement du terrorisme',
                              'questions': [{'id': 'C-2-11',
                                             'label': 'A-t-on relevé des opérations particulièrement '
                                                      'complexes, d’un montant inhabituellement élevé ou ne '
                                                      'paraissant pas avoir de justification économique ou '
                                                      'd’objet licite ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-13',
                                             'label': 'Y-a-t-il des points en suspens ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-15',
                                             'label': 'A-t-on décelé des anomalies ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-16',
                                             'label': 'Dépend de C-2-15',
                                             'type': 'table',
                                             'columns': ['Type',
                                                         'Montant (fcfa)',
                                                         'Description',
                                                         'Anomalie corrigée']},
                                            {'id': 'C-2-17',
                                             'label': 'Dépend de C-2-16, s’affiche si oui à été cliqué au '
                                                      'moins 1 fois sur anomalie corrigé',
                                             'type': 'textarea'},
                                            {'id': 'C-2-18', 'label': 'Conclusion', 'type': 'textarea'},
                                            {'id': 'C-2-19',
                                             'label': 'Ce point est-il à suivre sur N+1 ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '3.2.3',
                              'label': 'Contrôle des ajustements de clôture',
                              'questions': [{'id': 'C-2-21',
                                             'label': 'Résultats des travaux',
                                             'type': 'textarea'},
                                            {'id': 'C-2-22',
                                             'label': 'Y-a-t-il des points en suspens ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-24',
                                             'label': 'A-t-on décelé des anomalies ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-25',
                                             'label': 'Dépend de C-2-24',
                                             'type': 'table',
                                             'columns': ['Type',
                                                         'Montant (fcfa)',
                                                         'Description',
                                                         'Anomalie corrigée']},
                                            {'id': 'C-2-26',
                                             'label': 'Dépend de C-2-25, s’affiche si oui à été cliqué au '
                                                      'moins 1 fois sur anomalie corrigé',
                                             'type': 'textarea'},
                                            {'id': 'C-2-27', 'label': 'Conclusion', 'type': 'textarea'},
                                            {'id': 'C-2-28',
                                             'label': 'Ce point est-il à suivre sur N+1 ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '3.2.4',
                              'label': 'Écritures comptables et d’inventaires',
                              'questions': [{'id': 'C-2-30',
                                             'label': 'Résultats des travaux',
                                             'type': 'textarea'},
                                            {'id': 'C-2-31',
                                             'label': 'Y-a-t-il des points en suspens ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-33',
                                             'label': 'A-t-on décelé des anomalies ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'C-2-34',
                                             'label': 'Dépend de C-2-33',
                                             'type': 'table',
                                             'columns': ['Type',
                                                         'Montant (fcfa)',
                                                         'Description',
                                                         'Anomalie corrigée']},
                                            {'id': 'C-2-35',
                                             'label': 'Dépend de C-2-34, s’affiche si oui à été cliqué au '
                                                      'moins 1 fois sur anomalie corrigé',
                                             'type': 'textarea'},
                                            {'id': 'C-2-36', 'label': 'Conclusion', 'type': 'textarea'},
                                            {'id': 'C-2-37',
                                             'label': 'Ce point est-il à suivre sur N+1 ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []}]},
               {'id': '3.3',
                'label': 'État des anomalies',
                'questions': [{'id': 'C-2-6', 'label': 'Ont pour cycle risque fraude', 'type': 'textarea'},
                              {'id': 'C-2-25', 'label': 'Ont pour cycle ajustement', 'type': 'textarea'},
                              {'id': 'C-2-7', 'label': 'Ont pour cycle risque fraude', 'type': 'textarea'},
                              {'id': 'C-2-26', 'label': 'Ont pour cycle ajustement', 'type': 'textarea'},
                              {'id': 'C-3-1',
                               'label': 'Y a-t-il des anomalies individuellement significatives ?',
                               'type': 'radio_na',
                               'withNA': True},
                              {'id': 'C-3-4',
                               'label': 'Y a-t-il des anomalies cumulées significatives ?',
                               'type': 'radio_na',
                               'withNA': True}],
                'children': []},
               {'id': '3.4',
                'label': 'Points en suspens',
                'questions': [{'id': 'C-2-4', 'label': 'Pour risque de fraude', 'type': 'textarea'},
                              {'id': 'C-2-23', 'label': 'Pour ajustement', 'type': 'textarea'}],
                'children': []},
               {'id': '3.5',
                'label': 'Conclusion',
                'questions': [{'id': 'C-5-1',
                               'label': "Les diligences réalisées sont-elles cohérentes avec l'étendue, "
                                        "l'orientation des travaux et les lignes directrices définies dans "
                                        'le plan de mission ?',
                               'type': 'radio_na',
                               'withNA': True},
                              {'id': 'C-5-2',
                               'label': 'Des modifications doivent-elles être apportées au plan de mission ?',
                               'type': 'radio_na',
                               'withNA': True},
                              {'id': 'C-5-3',
                               'label': 'Au cours de sa mission, le commissaire aux comptes a-t-il été amené '
                                        'à modifier le seuil ou les seuils de signification et de '
                                        'planification en raison de la connaissance de faits nouveaux ou '
                                        'd’évolution de l’entité remettant en cause l’évaluation initiale '
                                        'des seuils',
                               'type': 'radio'},
                              {'id': 'C-5-4',
                               'label': 'Préciser les raisons de cette (ces) modification (s)',
                               'type': 'textarea'},
                              {'id': 'C-5-5',
                               'label': 'Seuils retenus fine',
                               'type': 'table',
                               'columns': ['Seuil initial FCFA(se rempli automatiquement se basant de de '
                                           'B-4-6 colonne de N)',
                                           'Seuil final (FCFA)']}],
                'children': []}]},
 {'id': '4',
  'label': 'Finalisation',
  'questions': [],
  'children': [{'id': '4.1',
                'label': 'Revue de cohérence / balance générale',
                'questions': [],
                'children': []},
               {'id': '4.2',
                'label': 'Évènements post clôture',
                'questions': [],
                'children': [{'id': '4.2.1',
                              'label': 'Identification des événements',
                              'questions': [{'id': 'D-2-1-1',
                                             'label': 'A-t-on pris connaissance des procédures mises en '
                                                      'place par l’entité pour identifier les événements '
                                                      'postérieurs à la clôture ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-2',
                                             'label': 'A-t-on consulté les procès-verbaux, ou les comptes '
                                                      'rendus des réunions de l’organe appelé à statuer sur '
                                                      'les comptes ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-3',
                                             'label': 'A-t-on consulté les procès-verbaux, ou les comptes '
                                                      'rendus des réunions de l’organe d’administration ou '
                                                      'de surveillance ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-4',
                                             'label': 'A-t-on consulté les procès-verbaux, ou les comptes '
                                                      'rendus des réunions de la direction de l’entité ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-5',
                                             'label': 'L’entité a-t-elle établi des documents prévisionnels '
                                                      'ou un budget ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-6',
                                             'label': 'Lors de la prise de connaissance de ces documents '
                                                      'a-t-on identifié des évolutions défavorables par '
                                                      'rapport à la précédente clôture ?',
                                             'type': 'radio_na',
                                             'withNA': True,
                                             'conditionalOn': {'questionId': 'D-2-1-5', 'value': 'oui'}},
                                            {'id': 'D-2-1-7',
                                             'label': 'Le cas échéant a-t-on intérrogé la direction de '
                                                      'l’entité sur les évolutions défavorables identifiées '
                                                      'lors de l’examen de ces documents ?',
                                             'type': 'radio_na',
                                             'withNA': True,
                                             'conditionalOn': {'questionId': 'D-2-1-5', 'value': 'oui'}},
                                            {'id': 'D-2-1-8',
                                             'label': 'L’entité a-t-elle établi des situations '
                                                      'intermédiaires postérieures à la précédente clôture ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-9',
                                             'label': 'Ces situations sont-elles établies selon les mêmes '
                                                      'principes comptables que ceux utilisés pour '
                                                      'l’établissement des comptes de l’exercice précédent ?',
                                             'type': 'radio_na',
                                             'withNA': True,
                                             'conditionalOn': {'questionId': 'D-2-1-8', 'value': 'oui'}},
                                            {'id': 'D-2-1-10',
                                             'label': 'A-t-on comparé ces situations intermédiaires avec',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-11',
                                             'label': 'La comparaison de ces situations avec les comptes de '
                                                      'l’exercice précédent ou avec le budget de l’exercice '
                                                      'en cours fait-elle apparaître des évolutions '
                                                      'significatives défavorables quant',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-12',
                                             'label': 'Le cas échéant, a-t-on interrogé la direction de '
                                                      'l’entité sur les évolutions défavorables identifiées '
                                                      'lors de ces comparaisons ?',
                                             'type': 'radio_na',
                                             'withNA': True,
                                             'conditionalOn': {'questionId': 'D-2-1-8', 'value': 'oui'}},
                                            {'id': 'D-2-1-13',
                                             'label': "Si aucune situation intermédiaire n'est établie, des "
                                                      "comparaisons peuvent-elles être faites à partir d'une "
                                                      'balance ou des comptes ?',
                                             'type': 'radio_na',
                                             'withNA': True,
                                             'conditionalOn': {'questionId': 'D-2-1-8', 'value': 'non'}},
                                            {'id': 'D-2-1-14',
                                             'label': 'Ces comparaisons sur la base de la balance ou des '
                                                      'comptes ont-elles montré des évolutions défavorables '
                                                      '?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-15',
                                             'label': 'Le cas échéant, a-t-on interrogé les dirigeants sur '
                                                      'les évolutions défavorables significatives résultant '
                                                      'de ces comparaisons ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-16',
                                             'label': 'S’est-on enquis auprès de la direction de l’entité de '
                                                      'sa connaissance de la survenance d’événements '
                                                      'postérieurs',
                                             'type': 'collecte',
                                             'options': ['Des faits de nature à infirmer des évaluations '
                                                         'faites à la clôture sont-ils survenus ?',
                                                         'Des faits permettant de corroborer des évaluations '
                                                         'faites à la clôture sont-ils survenus ?',
                                                         'Des éventualités précédemment identifiées se '
                                                         'sont-elles concrétisées ?',
                                                         'Des faits de nature à remettre en cause les ratios '
                                                         'financiers contractuels sont-ils apparus ?',
                                                         'Des événements survenus ou susceptibles de se '
                                                         'produire remettant en cause l’hypothèse de '
                                                         'continuité d’exploitation ont-ils été identifiés '
                                                         'par la direction ?',
                                                         'Des cessions d’actifs ont-elles été réalisées ou '
                                                         'sont-elles envisagées ?',
                                                         'Des expropriations sont-elles intervenues ?',
                                                         'Des actifs ont-ils été détruits (incendie, '
                                                         'inondation, …) ?',
                                                         'Des écritures d’ajustements significatifs ou '
                                                         'inhabituels ont-elles été enregistrées ou '
                                                         'sont-elles envisagées ?',
                                                         'Des émissions de nouvelles valeurs mobilières '
                                                         'sont-elles intervenues ?',
                                                         'De projets de fusion ou d’apports partiels '
                                                         'd’actifs sont-ils intervenus ?']},
                                            {'id': 'D-2-1-17',
                                             'label': 'S’est-on enquis auprès des personnes compétentes de '
                                                      'l’entité des points suivants',
                                             'type': 'collecte',
                                             'options': ['De l’évolution des procès, contentieux, et litiges '
                                                         'depuis les derniers contrôles ?',
                                                         'Des procès ou litiges sont-ils nés après la date '
                                                         'de clôture ?',
                                                         'Des contrôles fiscaux ou autres sont-ils '
                                                         'intervenus ?',
                                                         'Des conflits sociaux sont-ils intervenus ?',
                                                         'Des licenciements ont-ils été réalisés ?']},
                                            {'id': 'D-2-1-18',
                                             'label': "L’entité a-t-elle procédé à la fermeture d'un "
                                                      'établissement ou à une restructuration ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-19',
                                             'label': 'L’entité a-t-elle perdu des clients importants ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-20',
                                             'label': 'Des clients significatifs de l’entité ont-ils eu des '
                                                      'difficultés telles que : dépôt de bilan, plan de '
                                                      'sauvegarde, redressement judiciaire, liquidation '
                                                      'judiciaire ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-21',
                                             'label': 'Y-a-t-il eu un ou plusieurs sinistres depuis la '
                                                      'précédente clôture ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-22',
                                             'label': 'L’entité risque-t-elle de se voir supprimer des '
                                                      'concours financiers significatifs ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-23',
                                             'label': 'Des opérations exceptionnelles ou afférentes à des '
                                                      'exercices antérieurs sont-elles intervenues ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-24',
                                             'label': 'La structure financière a-t-elle évolué de manière '
                                                      'significative ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-25',
                                             'label': "En cas de cession d'actifs immobilisés, a-t-on "
                                                      'réalisé',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-26',
                                             'label': 'A-t-on obtenu des informations indiquant la '
                                                      'modification de la valeur d’inventaire des filiales '
                                                      'et participations, susceptibles d’entraîner des '
                                                      'dépréciations complémentaires ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-27',
                                             'label': 'L’entité possède-t-elle des créances libellées en '
                                                      'monnaie fondante ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-28',
                                             'label': 'Les principales devises étrangères dans lesquelles '
                                                      'sont libellées les créances et les dettes ont-elles '
                                                      'subi des variations erratiques à des dates proches de '
                                                      'la date de clôture ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-29',
                                             'label': 'Est-ce que des pertes allant au-delà des '
                                                      'dépréciations constatées ont été réalisées depuis la '
                                                      'clôture sur',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-1-30',
                                             'label': 'Avons-nous constaté depuis la clôture, une '
                                                      'augmentation anormale',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '4.2.2',
                              'label': "Avant l'arrêté des comptes",
                              'questions': [],
                              'children': [{'id': '4.2.2.1',
                                            'label': 'Traitement des événements postérieurs à la clôture '
                                                     "identifiés avant l'arrêté des comptes",
                                            'questions': [{'id': 'D-2-2-1',
                                                           'label': 'Les événements postérieurs identifiés '
                                                                    'intervenus avant la date d’arrêté des '
                                                                    'comptes font-ils l’objet d’un '
                                                                    'traitement comptable approprié dans les '
                                                                    'comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-2-2',
                                                           'label': 'L’entité a-t-elle l’intention de '
                                                                    'modifier de façon appropriée le projet '
                                                                    'de comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-2-3',
                                                           'label': 'A-t-on prévu de formuler une réserve, '
                                                                    'voire de refuser de certifier les '
                                                                    'comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-2-1',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-2-4',
                                                           'label': 'Les événements postérieurs importants '
                                                                    'identifiés font-ils l’objet d’une '
                                                                    'mention appropriée dans le rapport de '
                                                                    'l’organe compétent à l’organe appelé à '
                                                                    'statuer sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-2-2',
                                                                             'value': 'oui'}},
                                                          {'id': 'D-2-2-5',
                                                           'label': 'L’entité envisage-t-elle de modifier de '
                                                                    'façon appropriée le rapport de l’organe '
                                                                    'compétent à l’organe appelé à statuer '
                                                                    'sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-2-6',
                                                           'label': 'A-t-on prévu de formuler une '
                                                                    'observation dans le rapport sur les '
                                                                    'comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '4.2.3',
                              'label': "Après l'arrêté des comptes",
                              'questions': [],
                              'children': [{'id': '4.2.3.1',
                                            'label': 'Traitement des événements postérieurs à la clôture '
                                                     "identifiés après la date d'arrêté des comptes et avant "
                                                     'la date de signature du rapport sur les comptes',
                                            'questions': [{'id': 'D-2-3-1',
                                                           'label': 'Les évènements postérieurs connus par '
                                                                    'le commissaire aux comptes, intervenu '
                                                                    'avant la date d’arrêté des comptes, '
                                                                    'font ils l’objet d’un traitement '
                                                                    'comptable approprié dans les comptes',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-3-2',
                                                           'label': 'L’entité a-t-elle l’intention de '
                                                                    'modifier de façon appropriée les '
                                                                    'comptes, et de procéder à un nouvel '
                                                                    'arrêté des comptes modifiés par '
                                                                    'l’organe compétent ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-3-3',
                                                           'label': 'A-t-on prévu de formuler une réserve, '
                                                                    'voire de refuser de certifier les '
                                                                    'comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-3-1',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-3-4',
                                                           'label': 'Les évènementss postérieurs importants '
                                                                    'identifiés font ils l’objet d’une '
                                                                    'mention appropriée dans le rapport de '
                                                                    'l’organe compétent à l’organe appelé à '
                                                                    'statuer sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-3-1',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-3-5',
                                                           'label': 'L’entité envisage t elle de modifier de '
                                                                    'façon appropriée le rapport de l’organe '
                                                                    'compétent à l’organe appelé à statuer '
                                                                    'sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-3-6',
                                                           'label': 'A-t-on prévu de formuler une '
                                                                    'observation dans le rapport sur les '
                                                                    'comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-3-4',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-3-7',
                                                           'label': 'Concernant les événements postérieurs '
                                                                    'identifiés survenus après la date '
                                                                    'd’arrêté des comptes, l’entité a-t-elle '
                                                                    'l’intention de faire une communication '
                                                                    'à l’attention de l’organe appelé à '
                                                                    'statuer sur les comptes ?',
                                                           'type': 'textarea',
                                                           'conditionalOn': {'questionId': 'D-2-3-4',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-3-8',
                                                           'label': 'A-t-on prévu d’en faire mention dans le '
                                                                    'rapport sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '4.2.4',
                              'label': 'Après la signature du rapport du CAC',
                              'questions': [],
                              'children': [{'id': '4.2.4.1',
                                            'label': 'Traitement des événements postérieurs à la clôture '
                                                     'connus par le commissaire aux comptes après la '
                                                     'signature de son rapport',
                                            'questions': [{'id': 'D-2-4-1',
                                                           'label': 'Les événements postérieurs connus par '
                                                                    'le commissaire aux comptes, intervenus '
                                                                    'avant la date d’arrêté des comptes, '
                                                                    'font-ils l’objet d’un traitement '
                                                                    'comptable approprié dans les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-4-2',
                                                           'label': 'L’entité a-t-elle l’intention de '
                                                                    'modifier de façon appropriée les '
                                                                    'comptes, et de procéder à un arrêté des '
                                                                    'comptes modifiés par l’organe compétent '
                                                                    '?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-4-3',
                                                           'label': 'A-t-on prévu d’emettre un nouveau '
                                                                    'rapport prenant en compte les indices '
                                                                    'de l’évènement postérieur ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-4-1',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-4-4',
                                                           'label': 'A-t-on prévu d’emettre un nouveau '
                                                                    'rapport faisant une suite au nouvel '
                                                                    'arrêté de comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-4-5',
                                                           'label': 'Les évènements postérieurs importants '
                                                                    'connus par le commissaire aux comptes, '
                                                                    'et survenus avant le date d’arrêté des '
                                                                    'comptes compris, font ils l’objet d’une '
                                                                    'mention appropriée dans le rapport de '
                                                                    'l’organe compétent à l’organe appélé à '
                                                                    'statuer les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': [{'questionId': 'D-2-4-1',
                                                                              'value': 'non'},
                                                                             {'questionId': 'D-2-4-2',
                                                                              'value': 'oui'}]},
                                                          {'id': 'D-2-4-6',
                                                           'label': 'L’entité envisage t elle de modifier de '
                                                                    'façcon appropriée le rapport de '
                                                                    'l’organe compétent à l’organe appelé à '
                                                                    'statuer sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': [{'questionId': 'D-2-4-1',
                                                                              'value': 'non'},
                                                                             {'questionId': 'D-2-4-2',
                                                                              'value': 'oui'}]},
                                                          {'id': 'D-2-4-7',
                                                           'label': 'A-t-on prévu d’émettre un nouveau '
                                                                    'rapport incluant une observation dans '
                                                                    'le rapport sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-4-5',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-4-8',
                                                           'label': 'A-t-on prévu d’émettre un nouveau '
                                                                    'rapport prenant en considération les '
                                                                    'modifications apportées au rapport de '
                                                                    'l’organe compétent à l’organe appélé à '
                                                                    'statuersur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-2-4-5',
                                                                             'value': 'non'}},
                                                          {'id': 'D-2-4-9',
                                                           'label': 'Concernant les événements postérieurs '
                                                                    'connus par le commissaire aux comptes '
                                                                    'et survenus après la date d’arrêté des '
                                                                    'comptes, l’entité a-t-elle l’intention '
                                                                    'de faire une communication à '
                                                                    'l’attention de l’organe appelé à '
                                                                    'statuer sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-2-4-10',
                                                           'label': 'A-t-on prévu de rédiger la '
                                                                    'communication à l’attention de l’organe '
                                                                    'appelé à statuer sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]}]},
               {'id': '4.3',
                'label': "Continuité d'exploitation",
                'questions': [],
                'children': [{'id': '4.3.1',
                              'label': 'Indicateurs de nature financière',
                              'questions': [],
                              'children': [{'id': '4.3.1.1',
                                            'label': "Procédures d'évaluation des risques liés à  la "
                                                     "continuité d'exploitation et autres procédures liées",
                                            'questions': [{'id': 'D-3-1-1',
                                                           'label': "L'entité présente-t-elle des capitaux "
                                                                    'propres ou des fonds de roulement '
                                                                    'négatifs ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-2',
                                                           'label': "L'entité présente-t-elle des emprunts "
                                                                    'avec des échéances approchant leur '
                                                                    'terme sans possibilités réalistes '
                                                                    'd’extension ou de remboursement ; ou '
                                                                    'recours excessif à des emprunts à court '
                                                                    'terme pour financer des actifs à long '
                                                                    'terme ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-3',
                                                           'label': "L'entité présente-t-elle des "
                                                                    'indications du retrait du soutien '
                                                                    'financier par les créanciers ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-4',
                                                           'label': "L'entité présente-t-elle des comptes "
                                                                    'historiques ou prévisionnels montrant '
                                                                    'des flux de trésorerie d’exploitation '
                                                                    'négatifs ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-5',
                                                           'label': "L'entité présente-t-elle des ratios "
                                                                    'financiers clés défavorables ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-6',
                                                           'label': "L'entité présente-t-elle une perte "
                                                                    'd’exploitation significative ou une '
                                                                    'détérioration importante de la valeur '
                                                                    'des actifs utilisés pour générer les '
                                                                    'flux de trésorerie ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-7',
                                                           'label': "L'entité présente-t-elle des arriérés "
                                                                    'ou cessation de distribution de '
                                                                    'dividendes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-8',
                                                           'label': "L'entité présente-t-elle une incapacité "
                                                                    'à régler les créanciers à l’échéance ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-9',
                                                           'label': "L'entité présente-t-elle une incapacité "
                                                                    'à respecter les conditions des contrats '
                                                                    'de prêts ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-10',
                                                           'label': "L'entité présente-t-elle un changement "
                                                                    'dans l’attitude des fournisseurs '
                                                                    'refusant un crédit au profit de '
                                                                    'livraisons contre remboursement ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-1-11',
                                                           'label': "L'entité présente-t-elle une incapacité "
                                                                    'à obtenir du financement pour le '
                                                                    'développement de nouveaux produits ou '
                                                                    'pour d’autres investissements vitaux ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '4.3.2',
                              'label': 'Indicateurs de nature opérationnelle',
                              'questions': [],
                              'children': [{'id': '4.3.2.1',
                                            'label': "Procédures d'évaluation des risques liés à  la "
                                                     "continuité d'exploitation et autres procédures liées",
                                            'questions': [{'id': 'D-3-2-1',
                                                           'label': "La direction a-t-elle l'intention de "
                                                                    'mettre l’entité en liquidation ou de '
                                                                    'cesser ses activités ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2-2',
                                                           'label': 'Des départs de cadres dirigeants '
                                                                    'supérieurs sans remplacement sont-ils '
                                                                    'prévus ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2-3',
                                                           'label': 'Y-a-t-il un risque de perte d’un marché '
                                                                    'important, d’un (de) client(s) clé(s), '
                                                                    'd’une franchise, d’une licence ou d’un '
                                                                    '(de) fournisseur(s) principal (aux) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2-4',
                                                           'label': 'Y-a-t-il des troubles sociaux dans '
                                                                    "l'entité ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2-5',
                                                           'label': "L'entité présente-t-elle des risques de "
                                                                    'pénuries de matières premières '
                                                                    'essentielles ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2-6',
                                                           'label': "L'entité fait-elle face à l'émergence "
                                                                    'd’un concurrent avec un succès très '
                                                                    'marqué ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2-7',
                                                           'label': "L'entité fait-elle face à des "
                                                                    'changements technologiques susceptibles '
                                                                    "d'avoir des effets négatifs "
                                                                    "significatifs sur l'activité ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2-8',
                                                           'label': 'Existent-ils des problèmes '
                                                                    'environnementaux susceptibles de '
                                                                    "provoquer la fermeture de l'entreprise "
                                                                    '?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '4.3.3',
                              'label': 'Indicateurs de nature juridique',
                              'questions': [],
                              'children': [{'id': '4.3.3.1',
                                            'label': "Procédures d'évaluation des risques liés à  la "
                                                     "continuité d'exploitation et autres procédures liées",
                                            'questions': [{'id': 'D-3-3-1',
                                                           'label': 'A-t-on relevé des cas de non-respect '
                                                                    'des obligations relatives au capital '
                                                                    'social / perte de la moitié du capital '
                                                                    '?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-3-2',
                                                           'label': "L'entité est-elle inscrite au registre "
                                                                    'du commerce de privilèges ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-3-3',
                                                           'label': 'Y-a-t-il des procédures judiciaires ou '
                                                                    'administratives en cours à l’encontre '
                                                                    'de l’entité qui peuvent, si elles '
                                                                    'aboutissent, engendrer des dommages '
                                                                    'financiers auxquels l’entité ne pourra '
                                                                    'probablement pas faire face ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-3-4',
                                                           'label': "L'entité doit-elle faire face à des "
                                                                    'changements dans la loi ou la '
                                                                    'réglementation, ou dans la politique '
                                                                    'gouvernementale, risquant d’avoir un '
                                                                    'impact défavorable sur l’entité ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-3-5',
                                                           'label': 'Existent-ils des risques de sinistres '
                                                                    'non assurés ou insuffisamment assurés '
                                                                    'lors de leur survenance ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-3-2', 'label': '', 'type': 'textarea'}],
                                            'children': []}]}]},
               {'id': '4.4',
                'label': 'Comptes annuels',
                'questions': [],
                'children': [{'id': '4.4.1',
                              'label': 'Rapprochement',
                              'questions': [],
                              'children': [{'id': '4.4.1.1',
                                            'label': 'Rapprochement comptes annuels / comptes audités',
                                            'questions': [{'id': 'D-3-2', 'label': '', 'type': 'textarea'},
                                                          {'id': 'D-4-1-2',
                                                           'label': 'Les comptes annuels sont-ils cohérents '
                                                                    'avec les informations obtenues sur la '
                                                                    'société ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-4-1-3',
                                                           'label': 'Le rapprochement entre les comptes '
                                                                    'annuels et les comptes audités a-t-il '
                                                                    'mis en évidence des écarts ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-4-1-4',
                                                           'label': 'Les corrections nécessaires ont-elles '
                                                                    'été effectuées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-4-1-5',
                                                           'label': 'Quels sont les conséquences sur '
                                                                    "l'opinion ?",
                                                           'type': 'radio_na',
                                                           'withNA': True,
                                                           'conditionalOn': {'questionId': 'D-4-1-3',
                                                                             'value': 'oui'}}],
                                            'children': []}]},
                             {'id': '4.4.2',
                              'label': 'Choix de l’annexe',
                              'questions': [],
                              'children': [{'id': '4.4.2.1',
                                            'label': "Contrôle de l'annexe des comptes",
                                            'questions': [{'id': 'D-4-2-1',
                                                           'label': '( menu déroulant )',
                                                           'type': 'select',
                                                           'options': ["Quel est le type d'annexe ?",
                                                                       'Annexe micro entreprise,',
                                                                       'Annexe abrégée',
                                                                       'Annexe simplifié – PE',
                                                                       'Annexe de base']}],
                                            'children': []}]}]},
               {'id': '4.5',
                'label': 'Communication',
                'questions': [],
                'children': [{'id': '4.5.1',
                              'label': 'Déclarations à la direction',
                              'questions': [{'id': 'D-5-1',
                                             'label': 'La lettre confirmant certaines déclarations de la '
                                                      'direction a-t-elle été obtenue ou la lettre dans '
                                                      'laquelle le commissaire aux comptes explicite sa '
                                                      'compréhension des déclarations de la direction '
                                                      'a-t-elle été adressée au représentant légal ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-5-2',
                                             'label': 'Est-elle signée par le représentant légal en tant que '
                                                      "responsable de l'établissement des comptes (ou le "
                                                      'représentant légal a-t-il accusé réception du '
                                                      'courrier du commissaire aux comptes et confirmé par '
                                                      'écrit son accord sur les termes exposés) ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-5-3',
                                             'label': 'Aborde-t-elle les déclarations estimées nécessaires ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-5-4',
                                             'label': 'Aborde-t-elle les points obligatoires visés dans la '
                                                      'NEP 580.07 ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-5-5',
                                             'label': "L'affichage de cette question dépend de la réponse à "
                                                      'la question D-5-1',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '4.5.2',
                              'label': "Communication aux organes mentionnés à l'article L. 821-63 du code "
                                       'de commerce',
                              'questions': [],
                              'children': [{'id': '4.5.2.1',
                                            'label': 'Les éléments précisés par la NEP 260 - Communications '
                                                     "avec les organes mentionnées à l'article L.821-63 du "
                                                     'code de commerce',
                                            'questions': [{'id': 'D-5-6',
                                                           'label': "A-t-on communiqué l'étendue des travaux "
                                                                    "d'audit et le calendrier prévus ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-7',
                                                           'label': 'A-t-on communiqué sur les difficultés '
                                                                    "importantes rencontrées lors de l'audit "
                                                                    "des comptes, susceptibles d'affecter le "
                                                                    'bon déroulement des travaux ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-8',
                                                           'label': 'A-t-on communiqué sur les commentaires '
                                                                    'éventuels sur les pratiques comptables '
                                                                    "de l'entité susceptibles d'avoir une "
                                                                    'incidence significative sur les '
                                                                    'comptes, notamment les politiques '
                                                                    'comptables, les estimations comptables '
                                                                    'et les informations fournies en annexe '
                                                                    '?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-9',
                                                           'label': 'A-t-on communiqué sur les autres '
                                                                    "éléments apparus au cours de l'audit "
                                                                    'qui, selon le jugement professionnel, '
                                                                    'sont importants pour ces organes dans '
                                                                    'le cadre de leur fonction, notamment de '
                                                                    "surveillance du processus d'élaboration "
                                                                    'des comptes. (Il en est notamment ainsi '
                                                                    'des faiblesses significatives de '
                                                                    'contrôle interne) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-10',
                                                           'label': 'A-t-on communiqué sur les modifications '
                                                                    'qui paraissent devoir être apportées '
                                                                    'aux comptes devant être arrêtés ou aux '
                                                                    'autres documents comptables, en faisant '
                                                                    'toutes observations utiles sur les '
                                                                    "méthodes d'évaluation utilisées pour "
                                                                    'leur établissement ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-11',
                                                           'label': 'A-t-on communiqué sur les irrégularités '
                                                                    'et inexactitudes découvertes, le cas '
                                                                    'échéant ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-12',
                                                           'label': 'A-t-on communiqué sur les conclusions '
                                                                    'auxquelles conduisent les observations '
                                                                    'et rectifications ci-dessus sur les '
                                                                    'résultats de la période comparés à ceux '
                                                                    'de la période précédente ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.5.2.2',
                                            'label': 'Les éléments relatifs à la fraude (NEP 240)',
                                            'questions': [{'id': 'D-5-13',
                                                           'label': 'A-t-on communiqué sur les fraudes ayant '
                                                                    'entraîné des anomalies significatives '
                                                                    'dans les comptes ou les informations '
                                                                    'obtenues sur la possibilité de telles '
                                                                    'fraudes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-14',
                                                           'label': 'A-t-on communiqué sur les fraudes '
                                                                    'impliquant la direction ou des employés '
                                                                    'ayant un rôle clé dans le dispositif de '
                                                                    'contrôle interne ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-15',
                                                           'label': 'A-t-on communiqué sur les autres points '
                                                                    'ayant trait à la fraude dont la '
                                                                    'communication auxdits organes est '
                                                                    "laissée à l'appréciation du commissaire "
                                                                    'aux comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.5.2.3',
                                            'label': 'Les éléments relatifs aux parties liées (NEP 550)',
                                            'questions': [{'id': 'D-5-16',
                                                           'label': 'A-t-on communiqué sur les dispositions '
                                                                    'de la NEP 260 relatifs aux parties '
                                                                    'liées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.5.2.4',
                                            'label': 'Les cas de non-respect des textes légaux et '
                                                     'réglementaires (NEP 250)',
                                            'questions': [{'id': 'D-5-17',
                                                           'label': 'A-t-on communiqué sur les cas de '
                                                                    'non-respect des textes légaux et '
                                                                    'réglementaires relevés ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.5.2.5',
                                            'label': 'Les faiblesses de contrôle interne (NEP 265)',
                                            'questions': [{'id': 'D-5-18',
                                                           'label': 'A-t-on communiqué, par écrit, sur les '
                                                                    'faiblesses significatives du contrôle '
                                                                    'interne ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.5.2.6',
                                            'label': 'Les anomalies significatives (NEP 450)',
                                            'questions': [{'id': 'D-5-19',
                                                           'label': 'A-t-on demandé à la direction la '
                                                                    'correction des anomalies relevées '
                                                                    'autres que celles qui sont '
                                                                    'manifestement insignifiantes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-20',
                                                           'label': 'Ces corrections ont-elles été acceptées '
                                                                    '?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-21',
                                                           'label': 'A-t-on pris connaissance des motifs '
                                                                    'avancés par la direction pour ne pas '
                                                                    'les corriger et pris en compte ces '
                                                                    'motifs pour évaluer si les comptes, '
                                                                    'pris dans leur ensemble, comportent ou '
                                                                    'non des anomalies significatives ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-22',
                                                           'label': 'A-t-on déterminé si les anomalies non '
                                                                    'corrigées, prises individuellement ou '
                                                                    'en cumulé, sont significatives ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-23',
                                                           'label': 'L’incidence des anomalies non corrigées '
                                                                    'des périodes précédentes sur les '
                                                                    'comptes pris dans leur ensemble '
                                                                    'a-t-elle été prise en compte ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-24',
                                                           'label': 'A-t-on communiqué aux organes '
                                                                    "mentionnés à l'article L. 821-63 du "
                                                                    'code de commerce, les anomalies non '
                                                                    'corrigées, en mentionnant si elles sont '
                                                                    'jugées significatives et en les '
                                                                    "informant de l'incidence que celles-ci "
                                                                    'peuvent avoir, prises individuellement '
                                                                    "ou en cumulé, sur l'opinion exprimée "
                                                                    'dans le rapport sur les comptes ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-25',
                                                           'label': 'A-t-on demandé aux organes mentionnés à '
                                                                    "l'article L. 821-63 du code de "
                                                                    "commerce, que l'ensemble des anomalies "
                                                                    'non corrigées le soit ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.5.2.7',
                                            'label': 'Les éléments relatifs aux rapports sur les comptes '
                                                     '(NEP 700)',
                                            'questions': [{'id': 'D-5-26',
                                                           'label': 'A-t-on communiqué sur les motifs des '
                                                                    'réserves, refus ou impossibilité de '
                                                                    'certifier ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-5-27',
                                                           'label': 'A-t-on communiqué sur les motifs des '
                                                                    'observations ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '4.5.3',
                              'label': 'Révélation des faits délictueux',
                              'questions': [{'id': 'D-5-28',
                                             'label': 'A-t-on relevé des faits délictueux au cours de la '
                                                      'mission ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []}]},
               {'id': '4.6',
                'label': 'Rapport sur les comptes',
                'questions': [],
                'children': [{'id': '4.6.1',
                              'label': 'Opinion',
                              'questions': [{'id': 'D-6-1-1',
                                             'label': "La cohérence entre l'opinion formulée et les "
                                                      'conclusions retenues dans les feuilles de travail et '
                                                      'la note synthèse a-t-elle été vérifiée ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-1-2',
                                             'label': 'A-t-on relevé des anomalies significatives pouvant '
                                                      'affecter la comparabilité des informations relatives '
                                                      'aux exercices précédents avec les comptes de '
                                                      "l'exercice écoulé ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-1-3',
                                             'label': 'Le suivi des réserves (ou refus) formulés sur '
                                                      'l’exercice précédent a-t-il été réalisé ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-1-4',
                                             'label': 'A-t-on relevé des insuffisances, des omissions ou des '
                                                      'erreurs dans l’annexe des comptes ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-1-5',
                                             'label': "A-t-on obtenu l'assurance que les comptes ne "
                                                      "comportent pas d'anomalies significatives ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-1-6',
                                             'label': "L'entité est-elle une micro-entreprise soumise à "
                                                      "l'application de l'article L. 123-16-1 du code de "
                                                      'commerce ? Oui non N/A',
                                             'type': 'textarea'}],
                              'children': []},
                             {'id': '4.6.2',
                              'label': "Fondement de l'opinion",
                              'questions': [{'id': 'D-6-2-1',
                                             'label': 'La partie du rapport relative au fondement de '
                                                      "l'opinion contient-elle les points relatifs au "
                                                      "référentiel d'audit applicable ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-2-2',
                                             'label': 'La partie du rapport relative au fondement de '
                                                      "l'opinion contient-elle les points relatifs à "
                                                      "l'absence de fourniture de services interdits autres "
                                                      'que la certification des comptes ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-2-3',
                                             'label': 'La partie du rapport relative au fondement de '
                                                      "l'opinion contient-elle les points relatifs à "
                                                      "l'indépendance ?",
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': [{'id': '4.6.2.1',
                                            'label': 'Certification avec réserve pour désaccord',
                                            'questions': [{'id': 'D-6-2-4',
                                                           'label': 'A-t-on identifié des anomalies '
                                                                    'significatives non corrigées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-5',
                                                           'label': "L'incidence sur les comptes de ces "
                                                                    'anomalies significatives sont-elles '
                                                                    'clairement circonscrites ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-6',
                                                           'label': 'La formulation de la réserve est-elle '
                                                                    'suffisante ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.6.2.2',
                                            'label': 'Certification avec réserve pour limitation',
                                            'questions': [{'id': 'D-6-2-8',
                                                           'label': 'A-t-on pu mettre en œuvre toutes les '
                                                                    "procédures d'audit nécessaires au "
                                                                    "fondement de l'opinion ?",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-9',
                                                           'label': "L'incidence sur les comptes de ces "
                                                                    'limitations sont-elles clairement '
                                                                    'circonscrites ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-10',
                                                           'label': 'La formulation de la réserve est-elle '
                                                                    'suffisante ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-11',
                                                           'label': 'A-t-on indiqué et décrit ces '
                                                                    'limitations dans la partie "Fondement '
                                                                    'de l\'opinion" ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-12',
                                                           'label': 'A-t-on communiqué les motifs aux '
                                                                    "organes mentionnés à l'article L. "
                                                                    '821-63 du code de commerce ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.6.2.3',
                                            'label': 'Refus de certifier pour désaccord',
                                            'questions': [{'id': 'D-6-2-13',
                                                           'label': 'A-t-on détecté des anomalies '
                                                                    'significatives non corrigées pour '
                                                                    'lesquelles les incidences sur les '
                                                                    'comptes ne peuvent être clairement '
                                                                    'circonscrites ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-14',
                                                           'label': 'Est-on dans le cas où la formulation '
                                                                    "d'une réserve n'est pas suffisante ?",
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []},
                                           {'id': '4.6.2.4',
                                            'label': 'Impossibilité de certifier',
                                            'questions': [{'id': 'D-6-2-16',
                                                           'label': 'Est-on dans le cas où toutes les '
                                                                    "procédures d'audit nécessaires pour "
                                                                    'fonder notre opinion sur les comptes '
                                                                    "n'ont pas pu être mises en œuvre et que "
                                                                    "l'incidence sur les comptes de ces "
                                                                    'limitations ne peuvent être clairement '
                                                                    'circonscrites ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-17',
                                                           'label': "La formulation d'une réserve est-elle "
                                                                    'insuffisante pour permettre à '
                                                                    "l'utilisateur des comptes de fonder son "
                                                                    'jugement en connaissance de cause ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-2-18',
                                                           'label': 'Existe-t-il de multiples incertitudes '
                                                                    'dont les incidences sur les comptes ne '
                                                                    'peuvent être clairement circonscrites ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '4.6.3',
                              'label': 'Incertitude significative',
                              'questions': [{'id': 'D-6-3-1',
                                             'label': 'Existe-il une incertitude significative liée à des '
                                                      'évènements ou des circonstances, qui pris isolément '
                                                      'ou dans leur ensemble, sont susceptibles de mettre en '
                                                      "cause la capacité de l'entité à poursuivre son "
                                                      'exploitation ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-3-2',
                                             'label': "L'annexe des comptes contient-elle une information "
                                                      'pertinente relative à cette incertitude significative '
                                                      '?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-3-3',
                                             'label': 'Le rapport sur les comptes annuels contient-il une '
                                                      'partie distincte intitulée "incertitude significative '
                                                      'liée à la continuité d\'exploitation" ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-3-4',
                                             'label': 'A-t-on pris en compte les conséquences de cette '
                                                      "absence d'information sur le fondement de l'opinion ?",
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '4.6.4',
                              'label': 'Observation',
                              'questions': [{'id': 'D-6-4-1',
                                             'label': 'A-t-on identifié des changements de méthodes '
                                                      "comptables au cours de l'exercice ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-4-2',
                                             'label': 'A-t-on formulé une observation sur ce changement de '
                                                      'méthodes comptables ? (observation obligatoire)',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-4-3',
                                             'label': "En cas d'incertitude sur l'application d'un texte "
                                                      'légal ou réglementaire, a-t-on apprécié la nécessité '
                                                      "de formuler une observation lorsque l'information "
                                                      'fournie en annexe est pertinente ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-4-4',
                                             'label': "Si l'information n'est pas fournie en annexe ou n'est "
                                                      "pas pertinente, a-t-on évalué l'incidence sur "
                                                      "l'opinion ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-4-5',
                                             'label': "Y-a-t'il une (des) information(s) dans l'annexe sur "
                                                      "laquelle (lesquelles) il est pertinent d'attirer "
                                                      "l'attention du lecteur (sauf s'il a été décidé de "
                                                      "justifier d'appréciation sur cette (ces) "
                                                      'information(s)) ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-4-6',
                                             'label': 'A-t-on formulé une observation sur cette information '
                                                      '? (observation le cas échéant)',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-4-7',
                                             'label': 'A-t-on communiqué les motifs de cette (ou ces) '
                                                      "observation(s) aux organes mentionnés à l'article L. "
                                                      '821-63 du code de commerce ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '4.6.5',
                              'label': 'Justification des appréciations',
                              'questions': [{'id': 'D-6-5-1',
                                             'label': "L'entité est-elle soumise au respect de textes légaux "
                                                      'et réglementaires empêchant la communication des '
                                                      'appréciations dans le rapport sur les comptes annuels '
                                                      '?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-2',
                                             'label': 'A-t-on retenu une formulation des appréciations moins '
                                                      'développée ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-2-5-3',
                                             'label': 'Les points suivants sont respectés',
                                             'type': 'table',
                                             'columns': ['Élément', 'Observation']},
                                            {'id': 'D-6-5-5',
                                             'label': 'La formulation des appréciations fait-elle référence '
                                                      'explicitement aux dispositions des articles L. 821-53 '
                                                      'et R.821-180 du code de commerce ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-6',
                                             'label': 'A-t-on précisé en introduction de cette partie '
                                                      'relative à la justification des appréciations que',
                                             'type': 'collecte',
                                             'options': ['les appréciations sont celles qui, selon le '
                                                         'jugement professionnel du commissaire aux comptes, '
                                                         "ont été les plus importantes pour l'audit des "
                                                         "comptes de l'exercice ?",
                                                         "les appréciations s'inscrivent dans le contexte de "
                                                         "l'audit des comptes, pris dans leur ensemble, et "
                                                         "de la formulation de l'opinion formulée sur ces "
                                                         'comptes ?',
                                                         "il n'est pas exprimé d'opinion sur des éléments "
                                                         'des comptes pris isolément ?']},
                                            {'id': 'D-6-5-7',
                                             'label': 'A-t-on précisé pour chaque appréciation la '
                                                      'description du sujet et la référence, si elle est '
                                                      'possible, aux informations fournies dans les comptes '
                                                      'annuels ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-8',
                                             'label': 'A-t-on précisé pour chaque appréciation un résumé des '
                                                      'diligences effectuées par le commissaire aux comptes '
                                                      'pour fonder son appréciation',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-9',
                                             'label': "S'il existe une incertitude significative liée à la "
                                                      "continuité d'exploitation, a-t-on fait, dans la "
                                                      'partie "justification des appréciations", un renvoi à '
                                                      'la partie distincte du rapport relative à cette '
                                                      'incertitude ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-10',
                                             'label': 'Dans le cas de certification avec réserve ou refus de '
                                                      "certifier ou d'impossibilité de certifier, a-t-on "
                                                      'fait un renvoi à la partie relative au fondement de '
                                                      "l'opinion ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-11',
                                             'label': "S'est-on assuré que la justification des "
                                                      'appréciations ne conduit pas à dispenser des '
                                                      'informations dont la diffusion relève de la '
                                                      'responsabilité des dirigeants ?',
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-12',
                                             'label': "En cas d'impossibilité de certifier, a-t-on vérifié "
                                                      'que le rapport ne comporte pas de justification '
                                                      "d'appréciation sur d'autres éléments ?",
                                             'type': 'radio_na',
                                             'withNA': True},
                                            {'id': 'D-6-5-13',
                                             'label': 'Si un élément nécessite une justification des '
                                                      "appréciations, s'est-on assuré qu'il n'était pas "
                                                      'mentionné dans la partie du rapport relative aux '
                                                      'observations (sauf si changement de méthode '
                                                      'comptable) ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': []},
                             {'id': '4.6.6',
                              'label': 'Rapport de gestion & autres documents',
                              'questions': [{'id': 'D-6-6-1',
                                             'label': 'A-t-on relevé des anomalies lors des vérifications '
                                                      "effectuées en application de l'article L.821-54 et de "
                                                      "l'article L. 225-235 du code de commerce et de la NEP "
                                                      '9510 ?',
                                             'type': 'radio_na',
                                             'withNA': True}],
                              'children': [{'id': '4.6.6.1',
                                            'label': "S'agissant des informations données dans le rapport de "
                                                     'gestion et dans les autres documents sur la situation '
                                                     'financière et les comptes annuels :',
                                            'questions': [{'id': 'D-6-6-2',
                                                           'label': 'La partie du rapport sur les comptes '
                                                                    'annuels relative à ces vérifications '
                                                                    'contient-elle des observations ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-3',
                                                           'label': 'La partie du rapport sur les comptes '
                                                                    'annuels relative à ces vérifications '
                                                                    'contient-elle (le cas échéant), '
                                                                    'l’attestation de la sincérité des '
                                                                    'informations relatives aux délais de '
                                                                    'paiement mentionnées à l’article '
                                                                    'D.441-4 du code de commerce et de leur '
                                                                    'concordance avec les comptes annuels et '
                                                                    'la formulation, le cas échéant, de ses '
                                                                    'observations ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-4',
                                                           'label': 'La partie du rapport sur les comptes '
                                                                    'annuels relative à ces vérifications '
                                                                    'contient-elle les éventuelles '
                                                                    'irrégularités résultant de l’omission '
                                                                    'd’informations ou de documents prévus '
                                                                    'par les textes légaux et réglementaires '
                                                                    'ou par les statuts ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-5',
                                                           'label': 'La partie du rapport sur les comptes '
                                                                    'annuels relative à ces vérifications '
                                                                    'contient-elle les éventuelles autres '
                                                                    'inexactitudes relevées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-6',
                                                           'label': 'La partie du rapport sur les comptes '
                                                                    'annuels relative à ces vérifications '
                                                                    'contient-elle l’attestation de '
                                                                    'l’existence des informations requises '
                                                                    'par l’article L.225-37-4 du code de '
                                                                    'commerce ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-7',
                                                           'label': 'La partie du rapport sur les comptes '
                                                                    'annuels relative à ces vérifications '
                                                                    'contient-elle les éventuelles '
                                                                    'irrégularités résultant de l’omission '
                                                                    'd’informations ou de documents prévus '
                                                                    'par les textes légaux et réglementaires '
                                                                    'ou par les statuts ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-8',
                                                           'label': 'La partie du rapport sur les comptes '
                                                                    'annuels relative à ces vérifications '
                                                                    'contient-elle les éventuelles autres '
                                                                    'inexactitudes relevées ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-9',
                                                           'label': "L'entité a-t-elle réalisée au cours de "
                                                                    "l'exercice",
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-10',
                                                           'label': 'Ces informations sont-elles mentionnées '
                                                                    'dans le rapport de gestion ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-11',
                                                           'label': 'A-t-on mentionné dans notre rapport les '
                                                                    'conclusions des travaux réalisés sur '
                                                                    'ces informations ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-12',
                                                           'label': "L'entité est-elle exemptée de "
                                                                    "l'établissement du rapport de gestion, "
                                                                    "conformément à l'article L. 232-1 IV du "
                                                                    'code de commerce (petites entreprises '
                                                                    "au sens de l'article L. 123-16-1 du "
                                                                    'code de commerce sauf pour les sociétés '
                                                                    "appartenant à l'une des catégories "
                                                                    "définies à l'article L. 123-16-2 du "
                                                                    "code de commerce ou dont l'activité "
                                                                    'consiste à gérer des titres de '
                                                                    'participations ou des valeurs '
                                                                    'mobilières) ?',
                                                           'type': 'radio_na',
                                                           'withNA': True},
                                                          {'id': 'D-6-6-13',
                                                           'label': 'La partie relative à la "vérification '
                                                                    'des documents" a-t-elle été aménagée '
                                                                    'pour ne plus inclure une conclusion '
                                                                    'spécifique sur le rapport de gestion ?',
                                                           'type': 'radio_na',
                                                           'withNA': True}],
                                            'children': []}]},
                             {'id': '4.6.7',
                              'label': 'Autres contrôles',
                              'questions': [{'id': 'D-6-7-1',
                                             'label': 'Le rapport respecte-t-il les dispositions prévues au '
                                                      'paragraphe 18 de la NEP 700 en termes de contenu et '
                                                      'de forme ?',
                                             'type': 'radio'},
                                            {'id': 'D-6-7-2',
                                             'label': 'Le rapport est-il dûment daté et émis dans les délais '
                                                      'légaux ?',
                                             'type': 'radio'},
                                            {'id': 'D-6-7-3',
                                             'label': 'Les comptes annuels (bilan, compte de résultat et '
                                                      'annexe) sont-ils joints à notre rapport ?',
                                             'type': 'radio'}],
                              'children': []},
                             {'id': '4.6.8', 'label': 'Conclusion', 'questions': [], 'children': []}]},
               {'id': '4.7',
                'label': 'Rapport spécial',
                'questions': [{'id': 'D-7-1',
                               'label': 'A-t-on relevé au cours de notre audit des informations relevant des '
                                        'conventions réglementées ?',
                               'type': 'radio_na',
                               'withNA': True},
                              {'id': 'D-7-2',
                               'label': 'A-t-on obtenu les informations sur les conventions réglementées '
                                        'auprès de la direction ?',
                               'type': 'radio_na',
                               'withNA': True},
                              {'id': 'D-7-3',
                               'label': 'A-t-on vérifié la concordance des informations obtenues avec les '
                                        'documents de base ?',
                               'type': 'radio_na',
                               'withNA': True},
                              {'id': 'D-7-4',
                               'label': "Les procédures d'autorisation relevant de la forme juridique de "
                                        "l'entité auditée ont-elles été respectées ?",
                               'type': 'radio_na',
                               'withNA': True},
                              {'id': 'D-7-5',
                               'label': 'Les informations obtenues sont-elles suffisantes pour '
                                        "l'établissement du rapport spécial ?",
                               'type': 'radio_na',
                               'withNA': True}],
                'children': []}]}]
